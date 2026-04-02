// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./BridgeQuotaNFT.sol";

/// @title  RevenueVault
/// @notice Accumulates bridge fee revenue and distributes it to BFT NFT holders
///         on an epoch basis.
///
///         Flow:
///           1. Bridge.sol sends 20 % of each fee here via `receive()`.
///           2. Operator (owner) periodically calls `closeEpoch()`, which
///              snapshots the current balance as `epochRevenue[epoch]` and
///              records how many tokens were minted at that point.
///           3. BFT holder calls `claim(tokenId, epoch)` to pull their share:
///              epochRevenue[epoch] / snapshotSupply[epoch].
///              Each (tokenId, epoch) pair can only be claimed once.
contract RevenueVault is Ownable {

    BridgeQuotaNFT public nft;

    // ── Epoch state ───────────────────────────────────────────────────────────

    uint256 public currentEpoch;

    /// Total ETH distributed in a given epoch.
    mapping(uint256 => uint256) public epochRevenue;

    /// Number of BFT tokens minted when the epoch was closed
    /// (denominator for per-token share calculation).
    mapping(uint256 => uint256) public snapshotSupply;

    /// Tracks whether tokenId has already claimed epoch rewards.
    /// claimed[epoch][tokenId] = true after claim.
    mapping(uint256 => mapping(uint256 => bool)) public claimed;

    // ── Events ────────────────────────────────────────────────────────────────

    event EpochClosed(uint256 indexed epoch, uint256 revenue, uint256 supply);
    event Claimed(uint256 indexed epoch, uint256 indexed tokenId, address indexed recipient, uint256 amount);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address _nft) {
        nft = BridgeQuotaNFT(_nft);
    }

    // ── Receive ETH ───────────────────────────────────────────────────────────

    /// @notice Accepts ETH sent by Bridge.sol as revenue deposits.
    receive() external payable {}

    // ── Epoch management ──────────────────────────────────────────────────────

    /// @notice Close the current epoch: snapshot the pending balance and total
    ///         supply, then open a new epoch. Callable only by the owner (operator).
    ///
    ///         Pending balance = address(this).balance minus already-committed
    ///         revenue from previous epochs that has not been claimed yet.
    ///         Because claimed ETH leaves the contract when `claim()` is called,
    ///         `address(this).balance` at close time equals exactly the new revenue
    ///         accumulated since the previous close.
    function closeEpoch() external onlyOwner {
        uint256 supply = nft.totalMinted();
        require(supply > 0, "RevenueVault: no tokens minted yet");

        uint256 balance = address(this).balance;
        require(balance > 0, "RevenueVault: nothing to distribute");

        epochRevenue[currentEpoch]    = balance;
        snapshotSupply[currentEpoch]  = supply;

        emit EpochClosed(currentEpoch, balance, supply);

        currentEpoch++;
    }

    // ── Claim ─────────────────────────────────────────────────────────────────

    /// @notice Claim the revenue share for `tokenId` in `epoch`.
    ///         The caller must own the token at the time of claiming.
    ///         Each (tokenId, epoch) pair can only be claimed once.
    /// @param tokenId  BFT token id (1–1000).
    /// @param epoch    Epoch index to claim from.
    function claim(uint256 tokenId, uint256 epoch) external {
        require(epoch < currentEpoch,                  "RevenueVault: epoch not closed");
        require(nft.ownerOf(tokenId) == msg.sender,    "RevenueVault: not token owner");
        require(!claimed[epoch][tokenId],              "RevenueVault: already claimed");

        claimed[epoch][tokenId] = true;

        uint256 share = epochRevenue[epoch] / snapshotSupply[epoch];
        require(share > 0, "RevenueVault: zero share");

        (bool ok, ) = msg.sender.call{value: share}("");
        require(ok, "RevenueVault: transfer failed");

        emit Claimed(epoch, tokenId, msg.sender, share);
    }

    // ── View ──────────────────────────────────────────────────────────────────

    /// @notice Return the claimable share for a given tokenId / epoch without
    ///         executing the transfer. Returns 0 if already claimed.
    function pendingShare(uint256 tokenId, uint256 epoch) external view returns (uint256) {
        if (epoch >= currentEpoch)          return 0;
        if (claimed[epoch][tokenId])        return 0;
        uint256 supply = snapshotSupply[epoch];
        if (supply == 0)                    return 0;
        return epochRevenue[epoch] / supply;
    }
}
