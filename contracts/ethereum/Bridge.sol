//SPDX-License-Identifier: unlicensed
pragma solidity 0.7.6;

import "./extension/Admin.sol";
import "./interface/IBrigeToken.sol";

contract Bridge is Admin {

    bool bridgeOn = true;

    mapping(address => bool) public bridgeable;

    // `to` is bytes32 to support cross-chain destinations (e.g. Solana pubkeys)
    event TokenSent(bytes32 indexed to, address indexed token, uint256 amount);
    event TokenReceived(address indexed to, address indexed token, uint256 amount);

    constructor() {
        _owner = msg.sender;
        admin[msg.sender] = true;
    }

    /// @notice Burns tokens on this side and signals the bridge to mint on the destination chain.
    /// @param _token  Address of the bridgeable token
    /// @param _amount Amount to burn
    /// @param _to     Destination address on the target chain (bytes32 supports Solana pubkeys)
    function bridgeSent(address _token, uint256 _amount, bytes32 _to) external {
        require(bridgeOn, "Bridge is disabled");
        require(bridgeable[_token], "Token isn't bridgeable");
        IBridgeToken token = IBridgeToken(_token);
        token.ownerBurn(msg.sender, _amount);
        emit TokenSent(_to, _token, _amount);
    }

    /// @notice Mints tokens on this side after the bridge detects a burn on the source chain.
    /// @param _token  Address of the bridgeable token
    /// @param _amount Amount to mint
    /// @param _to     Recipient address on this (Ethereum) chain
    function bridgeReceive(address _token, uint256 _amount, address _to) onlyAdmin external {
        require(bridgeOn, "Bridge is disabled");
        require(bridgeable[_token], "Token isn't bridgeable");
        IBridgeToken token = IBridgeToken(_token);
        token.ownerMint(_to, _amount);
        emit TokenReceived(_to, _token, _amount);
    }

    function addToken(address _token) external onlyAdmin {
        bridgeable[_token] = true;
    }

    function removeToken(address _token) external onlyAdmin {
        bridgeable[_token] = false;
    }

    function bridgeStatus(bool _status) external onlyOwner {
        bridgeOn = _status;
    }
}
