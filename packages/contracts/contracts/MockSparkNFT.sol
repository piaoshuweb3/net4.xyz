// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockSparkNFT
 * @dev 测试用 Spark NFT 合约
 */
contract MockSparkNFT is ERC721, Ownable {
    uint256 private _tokenIdCounter;
    
    struct SparkAttributes {
        uint256 level;
        uint256 avatarType;
        uint256 computeLevel;
        string aiNickname;
        string metadataURI;
        uint256 mintedAt;
    }
    
    mapping(uint256 => SparkAttributes) public sparkAttributes;
    
    constructor() ERC721("Mock Spark NFT", "MSPARK") Ownable() {
        _tokenIdCounter = 0;
    }
    
    function mint(
        address to,
        uint256 level,
        uint256 avatarType,
        uint256 computeLevel,
        string calldata aiNickname,
        string calldata metadataURI
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        
        sparkAttributes[tokenId] = SparkAttributes({
            level: level,
            avatarType: avatarType,
            computeLevel: computeLevel,
            aiNickname: aiNickname,
            metadataURI: metadataURI,
            mintedAt: block.timestamp
        });
        
        return tokenId;
    }
    
    function getAttributes(uint256 tokenId) external view returns (SparkAttributes memory) {
        return sparkAttributes[tokenId];
    }
    
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
}