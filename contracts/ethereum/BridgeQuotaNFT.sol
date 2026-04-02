// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title  BridgeQuotaNFT (BFT)
/// @notice ERC-721 representing a revenue quota of the cross-chain bridge.
///         Fixed supply of 1 000. Each token entitles its holder to a 1/totalMinted
///         share of the revenue accumulated in RevenueVault every epoch.
///         Minted exclusively by QuotaSale during sale rounds.
contract BridgeQuotaNFT is ERC721, Ownable {

    uint256 public constant MAX_SUPPLY = 1000;

    /// Next tokenId to be minted (starts at 1).
    uint256 public nextTokenId = 1;

    /// Only address authorised to mint (QuotaSale contract).
    address public minter;

    // ── Events ────────────────────────────────────────────────────────────────

    event MinterSet(address indexed minter);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor() ERC721("Bridge Fee Token", "BFT") {}

    // ── Admin ─────────────────────────────────────────────────────────────────

    /// @notice Set the sale contract authorised to mint tokens.
    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
        emit MinterSet(_minter);
    }

    // ── Mint ──────────────────────────────────────────────────────────────────

    /// @notice Mint one token to `to`. Can only be called by the authorised minter.
    function mint(address to) external returns (uint256 tokenId) {
        require(msg.sender == minter,      "BFT: only minter");
        require(nextTokenId <= MAX_SUPPLY, "BFT: sold out");

        tokenId = nextTokenId++;
        _mint(to, tokenId);
    }

    // ── View ──────────────────────────────────────────────────────────────────

    /// @notice Total number of tokens minted so far.
    function totalMinted() external view returns (uint256) {
        return nextTokenId - 1;
    }
}
