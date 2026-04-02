// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBridgeToken {
    function ownerMint(address to, uint256 amount) external returns (bool);
    function ownerBurn(address from, uint256 amount) external returns (bool);
}
