// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title  GasReserve
/// @notice Simple ETH treasury that funds the coordinator's gas costs.
///
///         10 % of every bridge fee is deposited here by Bridge.sol.
///         The owner can top-up the coordinator wallet whenever its balance
///         drops below a safe threshold by calling `topUp`.
///
///         Anyone can call `topUpIfNeeded` to trigger an automatic top-up when
///         the coordinator balance drops below `minCoordinatorBalance`. This
///         lets off-chain keepers (or the coordinator itself) maintain its own
///         gas budget without requiring manual owner intervention.
contract GasReserve is Ownable {

    /// Coordinator wallet that needs to be kept funded.
    address payable public coordinator;

    /// Top-up amount sent to the coordinator in a single call.
    uint256 public topUpAmount = 0.1 ether;

    /// If the coordinator balance drops below this threshold,
    /// `topUpIfNeeded()` will trigger a transfer.
    uint256 public minCoordinatorBalance = 0.05 ether;

    // ── Events ────────────────────────────────────────────────────────────────

    event CoordinatorSet(address indexed coordinator);
    event TopUpAmountSet(uint256 amount);
    event MinBalanceSet(uint256 minBalance);
    event ToppedUp(address indexed coordinator, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    // ── Constructor ───────────────────────────────────────────────────────────

    /// @param _coordinator  Initial coordinator wallet address.
    constructor(address payable _coordinator) {
        require(_coordinator != address(0), "GasReserve: zero address");
        coordinator = _coordinator;
        emit CoordinatorSet(_coordinator);
    }

    // ── Receive ETH ───────────────────────────────────────────────────────────

    /// @notice Accepts ETH deposits from Bridge.sol and external top-ups.
    receive() external payable {}

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setCoordinator(address payable _coordinator) external onlyOwner {
        require(_coordinator != address(0), "GasReserve: zero address");
        coordinator = _coordinator;
        emit CoordinatorSet(_coordinator);
    }

    function setTopUpAmount(uint256 amount) external onlyOwner {
        require(amount > 0, "GasReserve: zero amount");
        topUpAmount = amount;
        emit TopUpAmountSet(amount);
    }

    function setMinCoordinatorBalance(uint256 minBalance) external onlyOwner {
        minCoordinatorBalance = minBalance;
        emit MinBalanceSet(minBalance);
    }

    // ── Top-up ────────────────────────────────────────────────────────────────

    /// @notice Unconditionally send `topUpAmount` ETH to the coordinator.
    ///         Owner-only — use for manual interventions.
    function topUp() external onlyOwner {
        _topUp();
    }

    /// @notice Send `topUpAmount` ETH to the coordinator if its balance is
    ///         below `minCoordinatorBalance`. Callable by anyone, enabling
    ///         permissionless keeper bots.
    function topUpIfNeeded() external {
        require(
            coordinator.balance < minCoordinatorBalance,
            "GasReserve: coordinator balance sufficient"
        );
        _topUp();
    }

    function _topUp() internal {
        uint256 amount = topUpAmount;
        require(address(this).balance >= amount, "GasReserve: insufficient reserve");

        (bool ok, ) = coordinator.call{value: amount}("");
        require(ok, "GasReserve: transfer failed");

        emit ToppedUp(coordinator, amount);
    }

    // ── Emergency withdrawal ──────────────────────────────────────────────────

    /// @notice Withdraw any amount from the reserve to an arbitrary address.
    ///         Owner-only — for emergency or rebalancing purposes.
    function withdraw(address payable to, uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "GasReserve: insufficient balance");
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "GasReserve: withdraw failed");
        emit Withdrawn(to, amount);
    }

    // ── View ──────────────────────────────────────────────────────────────────

    function reserveBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function coordinatorBalance() external view returns (uint256) {
        return coordinator.balance;
    }
}
