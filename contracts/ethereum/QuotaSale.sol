// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./BridgeQuotaNFT.sol";

/// @title  QuotaSale
/// @notice Sells BFT quotas in rounds with split payment:
///         the buyer pays half in ETH here and half in SOL on the Solana program.
///
///         Flow:
///           1. User calls openOrder(solanaAddress) with msg.value >= round.ethPrice
///           2. Backend detects OrderOpened, waits for SOL payment (up to 24 h deadline)
///           3. Backend confirms SOL received → calls completeOrder(orderId)
///              → ETH NFT is minted  |  backend also mints the SOL NFT off-chain
///           4. If deadline passes without SOL payment: user calls refund(orderId)
contract QuotaSale is Ownable {

    BridgeQuotaNFT public nft;

    // ── Rounds ────────────────────────────────────────────────────────────────

    struct Round {
        uint256 ethPrice;    // ETH price in wei equivalent to $100 (adjustable)
        uint256 startTime;   // unix timestamp when the round opens
        uint256 endTime;     // unix timestamp when the round closes
        uint256 maxSupply;   // quotas available in this round
        uint256 sold;        // quotas reserved (sold) in this round
    }

    Round[] public rounds;
    uint256 public activeRound;

    // ── Orders ────────────────────────────────────────────────────────────────

    enum OrderStatus { Pending, Complete, Refunded }

    struct Order {
        address  buyer;
        bytes32  solanaAddress;  // buyer's Solana pubkey (32 bytes)
        uint256  ethPaid;
        uint256  roundId;
        uint256  deadline;       // openOrder timestamp + 24 h
        OrderStatus status;
    }

    mapping(uint256 => Order) public orders;
    uint256 private _nextOrderId = 1;

    // ── Events ────────────────────────────────────────────────────────────────

    event RoundAdded(uint256 indexed roundId, uint256 ethPrice, uint256 startTime, uint256 endTime, uint256 maxSupply);
    event OrderOpened(uint256 indexed orderId, address indexed buyer, bytes32 solanaAddress, uint256 ethPaid, uint256 deadline);
    event OrderCompleted(uint256 indexed orderId, uint256 indexed tokenId);
    event OrderRefunded(uint256 indexed orderId, address indexed buyer, uint256 amount);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address _nft) {
        nft = BridgeQuotaNFT(_nft);
    }

    // ── Round management ──────────────────────────────────────────────────────

    /// @notice Create a new sale round.
    /// @param ethPrice  Price in wei equivalent to $100 (half the $200 quota).
    ///                  Example at $2 500/ETH: 0.04 ether (= $100).
    function addRound(
        uint256 ethPrice,
        uint256 startTime,
        uint256 endTime,
        uint256 maxSupply
    ) external onlyOwner {
        rounds.push(Round({
            ethPrice:  ethPrice,
            startTime: startTime,
            endTime:   endTime,
            maxSupply: maxSupply,
            sold:      0
        }));
        emit RoundAdded(rounds.length - 1, ethPrice, startTime, endTime, maxSupply);
    }

    /// @notice Update the ETH price of a round (e.g. when ETH/USD drifts significantly).
    function setEthPrice(uint256 roundId, uint256 newPrice) external onlyOwner {
        rounds[roundId].ethPrice = newPrice;
    }

    /// @notice Set which round is currently active.
    function setActiveRound(uint256 roundId) external onlyOwner {
        require(roundId < rounds.length, "QuotaSale: invalid round");
        activeRound = roundId;
    }

    // ── Purchase ──────────────────────────────────────────────────────────────

    /// @notice Step 1: user reserves one quota by paying the ETH half.
    ///         They have 24 hours to complete the SOL payment via the Solana program.
    /// @param solanaAddress  Solana pubkey (32 bytes) that will receive the SOL NFT.
    function openOrder(bytes32 solanaAddress) external payable returns (uint256 orderId) {
        Round storage round = rounds[activeRound];

        require(block.timestamp >= round.startTime, "QuotaSale: round not started");
        require(block.timestamp <= round.endTime,   "QuotaSale: round ended");
        require(round.sold < round.maxSupply,        "QuotaSale: round sold out");
        require(msg.value >= round.ethPrice,         "QuotaSale: insufficient ETH");

        orderId = _nextOrderId++;
        orders[orderId] = Order({
            buyer:         msg.sender,
            solanaAddress: solanaAddress,
            ethPaid:       msg.value,
            roundId:       activeRound,
            deadline:      block.timestamp + 24 hours,
            status:        OrderStatus.Pending
        });

        round.sold++;

        emit OrderOpened(orderId, msg.sender, solanaAddress, msg.value, orders[orderId].deadline);
    }

    /// @notice Step 2: backend confirms SOL payment and completes the order.
    ///         Mints the ETH NFT to the buyer.
    ///         (Backend also mints the Solana NFT off-chain after this call.)
    function completeOrder(uint256 orderId) external onlyOwner returns (uint256 tokenId) {
        Order storage order = orders[orderId];

        require(order.status == OrderStatus.Pending, "QuotaSale: order not pending");
        require(block.timestamp <= order.deadline,   "QuotaSale: order expired");

        order.status = OrderStatus.Complete;
        tokenId = nft.mint(order.buyer);

        emit OrderCompleted(orderId, tokenId);
    }

    /// @notice Refund: user calls this if the deadline passes without backend completing.
    ///         Returns the ETH paid and frees the quota in the round.
    function refund(uint256 orderId) external {
        Order storage order = orders[orderId];

        require(order.buyer == msg.sender,           "QuotaSale: not your order");
        require(order.status == OrderStatus.Pending, "QuotaSale: order not pending");
        require(block.timestamp > order.deadline,    "QuotaSale: deadline not reached");

        order.status = OrderStatus.Refunded;
        rounds[order.roundId].sold--;

        (bool ok, ) = msg.sender.call{value: order.ethPaid}("");
        require(ok, "QuotaSale: refund failed");

        emit OrderRefunded(orderId, msg.sender, order.ethPaid);
    }

    // ── View ──────────────────────────────────────────────────────────────────

    function getRound(uint256 roundId) external view returns (Round memory) {
        return rounds[roundId];
    }

    function totalRounds() external view returns (uint256) {
        return rounds.length;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    /// @notice Withdraw accumulated ETH sales proceeds to the project treasury.
    function withdraw(address payable to) external onlyOwner {
        (bool ok, ) = to.call{value: address(this).balance}("");
        require(ok, "QuotaSale: withdraw failed");
    }
}
