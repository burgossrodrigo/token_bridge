//SPDX-License-Identifier: unlicensed
pragma solidity 0.7.6;

interface IBridgeToken {
    function ownerMint(address to, uint amount) external returns(bool);
    function ownerBurn(address from, uint amount) external returns(bool);
}