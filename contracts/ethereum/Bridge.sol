// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title  Bridge
/// @notice Chain-agnostic lock/release vault bridge.
///
///         Each deployment of this contract lives on one EVM chain and can
///         bridge tokens to ANY other chain (Solana, BNB, TRON, etc.) through
///         registered BridgePairs. A BridgePair binds a local ERC-20 address to
///         a (destChainId, destToken) tuple, where destToken is bytes32 to
///         accommodate both EVM addresses (right-padded 20 bytes) and non-EVM
///         identifiers like Solana 32-byte pubkeys.
///
///         Chain ID convention (used in pairs and vouchers):
///           EVM chains  → EIP-155 chainId (1 = ETH, 56 = BNB, 137 = Polygon …)
///           Solana      → 900 (protocol-defined constant, no EIP-155)
///           TRON        → 901
///           (add more in coordinator config and frontend as needed)
///
///         Why lock instead of burn/mint:
///           A relay bug (missed event, wrong coordinator address) cannot destroy
///           tokens — they stay in this vault until claimed or self-refunded after
///           REFUND_DELAY (7 days). Standard ERC-20 (no ownerMint/ownerBurn) means
///           any token can be bridged without custom extensions.
///
///         Flow (this chain → remote):
///           1. User calls bridgeSend(token, destChainId, amount, to) + fee.
///              Tokens locked; LockRecord written; TokenSent(eventId, …) emitted.
///           2. Coordinator detects event, signs remote-chain claim voucher.
///           3. User submits voucher on the destination chain program/contract.
///           4. If coordinator fails within REFUND_DELAY → user calls refund(eventId).
///
///         Flow (remote → this chain):
///           1. User locks/burns on the remote chain; coordinator detects event.
///           2. Coordinator signs EVM claim voucher (ECDSA, EIP-191).
///           3. User calls claim(eventId, srcChainId, token, …) + fee here.
///              Tokens released from vault.
///
///         Fee model: EIP-1559-style surge — see _advanceWindow().
///         Fee split: 20% RevenueVault · 10% GasReserve · 70% Treasury.
contract Bridge is Ownable {
    using ECDSA     for bytes32;
    using SafeERC20 for IERC20;

    // ── Chain ID constants ────────────────────────────────────────────────────

    /// Protocol-assigned chain IDs for non-EVM networks.
    uint256 public constant CHAIN_SOLANA = 900;
    uint256 public constant CHAIN_TRON   = 901;

    // ── Bridge pairs ──────────────────────────────────────────────────────────

    /// @notice Links a local ERC-20 token to its counterpart on a remote chain.
    /// @dev    destToken is bytes32 to support both EVM addresses (20 bytes,
    ///         right-zero-padded) and non-EVM pubkeys/addresses (up to 32 bytes).
    struct BridgePair {
        bytes32 destToken;  // token identifier on the destination chain
        bool    active;
    }

    /// localToken → destChainId → BridgePair
    mapping(address => mapping(uint256 => BridgePair)) public pairs;

    // ── Fee parameters ────────────────────────────────────────────────────────

    uint256 public constant BASE_FEE      = 0.03 ether;
    uint256 public constant WINDOW_SIZE   = 256;  // blocks per surge window
    uint256 public constant TARGET_CLAIMS = 100;  // target ops per window

    uint256 public currentFee      = BASE_FEE;
    uint256 public windowStart;
    uint256 public claimsThisWindow;

    // ── Revenue split ─────────────────────────────────────────────────────────

    uint256 public constant REVENUE_VAULT_BPS = 2000; // 20 %
    uint256 public constant GAS_RESERVE_BPS   = 1000; // 10 %

    address payable public revenueVault;
    address payable public gasReserve;
    address payable public treasury;

    // ── Lock records ──────────────────────────────────────────────────────────

    uint256 public constant REFUND_DELAY = 7 days;

    struct LockRecord {
        address  sender;
        address  token;
        uint256  destChainId;
        uint256  amount;
        uint256  lockedAt;
        bool     released;
    }

    /// eventId → LockRecord (populated by bridgeSend)
    mapping(bytes32 => LockRecord) public locks;

    /// Aggregate view: user → token → total currently locked (informational).
    mapping(address => mapping(address => uint256)) public locked;

    // ── Bridge state ──────────────────────────────────────────────────────────

    bool public bridgeOn = true;

    /// Coordinator's Ethereum address — sole authority to sign claim vouchers.
    address public coordinator;

    /// Replay-protection for claim() calls.
    mapping(bytes32 => bool) public claimed;

    uint256 private _nonce;

    // ── Events ────────────────────────────────────────────────────────────────

    /// @notice Emitted by bridgeSend; coordinator relays this to the destination chain.
    event TokenSent(
        bytes32 indexed eventId,
        uint256 indexed destChainId,
        bytes32 indexed destToken,    // destination-side token (bytes32)
        bytes32         to,           // recipient on destination chain (bytes32)
        address         srcToken,     // source-side token (ERC-20)
        uint256         amount
    );

    /// @notice Emitted when a user successfully claims tokens via voucher.
    event TokenClaimed(
        bytes32 indexed eventId,
        uint256 indexed srcChainId,
        address indexed recipient,
        address         token,
        uint256         amount
    );

    /// @notice Emitted when a sender self-refunds a timed-out lock.
    event TokenRefunded(
        bytes32 indexed eventId,
        address indexed sender,
        address indexed token,
        uint256         amount
    );

    event PairAdded(address indexed token, uint256 indexed destChainId, bytes32 destToken);
    event PairUpdated(address indexed token, uint256 indexed destChainId, bytes32 destToken, bool active);
    event FeeUpdated(uint256 newFee, uint256 claimsInWindow);
    event FeesDistributed(uint256 toVault, uint256 toGasReserve, uint256 toTreasury);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(
        address _coordinator,
        address payable _revenueVault,
        address payable _gasReserve,
        address payable _treasury
    ) {
        require(_coordinator  != address(0), "Bridge: zero coordinator");
        require(_revenueVault != address(0), "Bridge: zero vault");
        require(_gasReserve   != address(0), "Bridge: zero reserve");
        require(_treasury     != address(0), "Bridge: zero treasury");

        coordinator  = _coordinator;
        revenueVault = _revenueVault;
        gasReserve   = _gasReserve;
        treasury     = _treasury;
        windowStart  = block.number;
    }

    // ── Pair management ───────────────────────────────────────────────────────

    /// @notice Register a new bridge pair.
    /// @param ethToken     Local ERC-20 token address.
    /// @param destChainId  Destination chain (EIP-155 for EVM; 900 = Solana, 901 = TRON).
    /// @param destToken    Token identifier on the destination chain (bytes32).
    ///                     For EVM tokens: abi.encode(address) (right-padded 20 bytes).
    ///                     For Solana SPL mints: 32-byte pubkey.
    function addPair(
        address ethToken,
        uint256 destChainId,
        bytes32 destToken
    ) external onlyOwner {
        require(ethToken   != address(0), "Bridge: zero token");
        require(destChainId != 0,          "Bridge: zero chainId");
        require(destToken  != bytes32(0),  "Bridge: zero destToken");

        pairs[ethToken][destChainId] = BridgePair({ destToken: destToken, active: true });
        emit PairAdded(ethToken, destChainId, destToken);
    }

    /// @notice Enable or disable an existing pair without removing it.
    function setPairActive(address ethToken, uint256 destChainId, bool active) external onlyOwner {
        BridgePair storage pair = pairs[ethToken][destChainId];
        require(pair.destToken != bytes32(0), "Bridge: pair does not exist");
        pair.active = active;
        emit PairUpdated(ethToken, destChainId, pair.destToken, active);
    }

    // ── Send (lock → event) ───────────────────────────────────────────────────

    /// @notice Lock `amount` of `token` and signal the destination chain to
    ///         release/mint. Caller must send at least `currentFee` ETH.
    ///
    ///         The `eventId` emitted in TokenSent is the key the coordinator
    ///         uses when building the destination-chain claim voucher.
    ///         If the coordinator doesn't act within REFUND_DELAY, call refund().
    ///
    /// @param token       Local ERC-20 token (must have an active pair for destChainId).
    /// @param destChainId Destination chain identifier.
    /// @param amount      Amount to lock and bridge.
    /// @param to          Recipient on the destination chain (bytes32).
    function bridgeSend(
        address token,
        uint256 destChainId,
        uint256 amount,
        bytes32 to
    ) external payable {
        require(bridgeOn, "Bridge: disabled");
        BridgePair memory pair = pairs[token][destChainId];
        require(pair.active,  "Bridge: pair not active");
        require(amount > 0,   "Bridge: zero amount");

        uint256 fee = _advanceWindow();
        require(msg.value >= fee, "Bridge: insufficient fee");

        bytes32 eventId = keccak256(
            abi.encodePacked(block.chainid, _nonce++, msg.sender, token, destChainId, amount, to)
        );

        // Effects.
        locks[eventId] = LockRecord({
            sender:      msg.sender,
            token:       token,
            destChainId: destChainId,
            amount:      amount,
            lockedAt:    block.timestamp,
            released:    false
        });
        locked[msg.sender][token] += amount;

        // Interactions.
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        _distributeFee(msg.value);

        emit TokenSent(eventId, destChainId, pair.destToken, to, token, amount);
    }

    // ── Claim (remote → this chain, pull model) ───────────────────────────────

    /// @notice Release tokens to `recipient` using a coordinator-signed voucher
    ///         that confirms a corresponding lock on the source chain.
    ///
    ///         Voucher hash (EIP-191 signed by coordinator):
    ///           keccak256(abi.encodePacked(
    ///               eventId, srcChainId, token, amount, recipient, deadline, block.chainid
    ///           ))
    ///
    ///         Including both srcChainId and block.chainid in the hash prevents
    ///         cross-chain replay (same voucher cannot be used on a different
    ///         deployment of Bridge.sol on another EVM chain).
    ///
    /// @param eventId    Source-chain lock event identifier (replay-protection key).
    /// @param srcChainId Source chain where the lock/burn happened.
    /// @param token      Local ERC-20 to release from the vault.
    /// @param amount     Amount to release.
    /// @param recipient  Address that receives the tokens on this chain.
    /// @param deadline   Voucher expiry (unix timestamp).
    /// @param signature  Coordinator ECDSA signature over the voucher hash.
    function claim(
        bytes32 eventId,
        uint256 srcChainId,
        address token,
        uint256 amount,
        address recipient,
        uint256 deadline,
        bytes calldata signature
    ) external payable {
        require(bridgeOn,                    "Bridge: disabled");
        require(pairs[token][srcChainId].active, "Bridge: pair not active");
        require(!claimed[eventId],           "Bridge: already claimed");
        require(block.timestamp <= deadline, "Bridge: voucher expired");
        require(amount > 0,                  "Bridge: zero amount");

        uint256 fee = _advanceWindow();
        require(msg.value >= fee, "Bridge: insufficient fee");

        bytes32 voucherHash = keccak256(
            abi.encodePacked(eventId, srcChainId, token, amount, recipient, deadline, block.chainid)
        );
        address signer = voucherHash.toEthSignedMessageHash().recover(signature);
        require(signer == coordinator, "Bridge: invalid signature");

        // Effects.
        claimed[eventId] = true;

        // Interactions.
        IERC20(token).safeTransfer(recipient, amount);
        _distributeFee(msg.value);

        emit TokenClaimed(eventId, srcChainId, recipient, token, amount);
    }

    // ── Self-refund (timeout rescue) ──────────────────────────────────────────

    /// @notice Reclaim locked tokens if the coordinator has not acted within
    ///         REFUND_DELAY. No permission required — purely user-controlled.
    function refund(bytes32 eventId) external {
        LockRecord storage rec = locks[eventId];

        require(rec.sender == msg.sender,                        "Bridge: not your lock");
        require(!rec.released,                                   "Bridge: already released");
        require(block.timestamp >= rec.lockedAt + REFUND_DELAY, "Bridge: delay not elapsed");

        rec.released = true;
        locked[msg.sender][rec.token] -= rec.amount;

        IERC20(rec.token).safeTransfer(msg.sender, rec.amount);

        emit TokenRefunded(eventId, msg.sender, rec.token, rec.amount);
    }

    // ── Emergency admin release ───────────────────────────────────────────────

    /// @notice Release a stuck lock before REFUND_DELAY (owner only, last resort).
    function adminRelease(bytes32 eventId) external onlyOwner {
        LockRecord storage rec = locks[eventId];
        require(!rec.released, "Bridge: already released");

        rec.released = true;
        locked[rec.sender][rec.token] -= rec.amount;

        IERC20(rec.token).safeTransfer(rec.sender, rec.amount);

        emit TokenRefunded(eventId, rec.sender, rec.token, rec.amount);
    }

    // ── Internal: fee ─────────────────────────────────────────────────────────

    function _advanceWindow() internal returns (uint256) {
        if (block.number >= windowStart + WINDOW_SIZE) {
            uint256 numerator   = 7 * TARGET_CLAIMS + claimsThisWindow;
            uint256 denominator = 8 * TARGET_CLAIMS;
            uint256 next        = currentFee * numerator / denominator;
            currentFee = next < BASE_FEE ? BASE_FEE : next;

            emit FeeUpdated(currentFee, claimsThisWindow);

            claimsThisWindow = 0;
            windowStart      = block.number;
        }

        claimsThisWindow++;
        return currentFee;
    }

    function _distributeFee(uint256 amount) internal {
        uint256 toVault      = amount * REVENUE_VAULT_BPS / 10_000;
        uint256 toGasReserve = amount * GAS_RESERVE_BPS   / 10_000;
        uint256 toTreasury   = amount - toVault - toGasReserve;

        (bool ok1, ) = revenueVault.call{value: toVault}("");
        (bool ok2, ) = gasReserve.call{value: toGasReserve}("");
        (bool ok3, ) = treasury.call{value: toTreasury}("");
        require(ok1 && ok2 && ok3, "Bridge: fee transfer failed");

        emit FeesDistributed(toVault, toGasReserve, toTreasury);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setBridgeStatus(bool status) external onlyOwner { bridgeOn = status; }

    function setCoordinator(address _c) external onlyOwner {
        require(_c != address(0), "Bridge: zero address");
        coordinator = _c;
    }

    function setRevenueVault(address payable _v) external onlyOwner { revenueVault = _v; }
    function setGasReserve(address payable _r)   external onlyOwner { gasReserve   = _r; }
    function setTreasury(address payable _t)      external onlyOwner { treasury     = _t; }

    // ── View ──────────────────────────────────────────────────────────────────

    function quoteFee() external view returns (uint256) {
        if (block.number >= windowStart + WINDOW_SIZE) {
            uint256 n = 7 * TARGET_CLAIMS + claimsThisWindow;
            uint256 next = currentFee * n / (8 * TARGET_CLAIMS);
            return next < BASE_FEE ? BASE_FEE : next;
        }
        return currentFee;
    }

    function getPair(address token, uint256 destChainId)
        external view returns (bytes32 destToken, bool active)
    {
        BridgePair memory p = pairs[token][destChainId];
        return (p.destToken, p.active);
    }

    function vaultBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}
