// SPDX-License-Identifier: unlicensed
pragma solidity 0.7.6;

import "./BridgeToken.sol";
import "./extension/Admin.sol";

interface IBridge {
    function addToken(address _token) external;
}

contract BridgeTokenFactory is Admin {

    IBridge public bridge;

    event TokenDeployed(
        address indexed token,
        address indexed owner,
        string name,
        string symbol,
        uint8 decimals,
        uint maxSupply
    );

    constructor(address bridgeAddress) {
        _owner = msg.sender;
        admin[msg.sender] = true;
        bridge = IBridge(bridgeAddress);
    }

    /**
     * @dev Deploys a new BridgeToken, registers it in the Bridge, and
     *      transfers ownership to the caller. The Bridge contract is set
     *      as admin on the token so it can mint and burn on both sides.
     * @param name_      Token name
     * @param symbol_    Token symbol
     * @param decimals_  Number of decimals
     * @param maxSupply_ Maximum token supply
     * @return address of the deployed token
     */
    function deployToken(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint maxSupply_
    ) external onlyAdmin returns (address) {
        // Deploy — factory is msg.sender inside BridgeToken constructor,
        // so factory becomes the initial owner and can configure it.
        BridgeToken token = new BridgeToken(name_, symbol_, decimals_, maxSupply_);

        // Grant the Bridge contract admin rights so it can call ownerMint/ownerBurn.
        token.setAdmin(address(bridge));

        // Register the token in the Bridge as bridgeable.
        bridge.addToken(address(token));

        // Hand ownership to whoever called deployToken.
        token.transferOwnership(msg.sender);

        emit TokenDeployed(address(token), msg.sender, name_, symbol_, decimals_, maxSupply_);
        return address(token);
    }
}
