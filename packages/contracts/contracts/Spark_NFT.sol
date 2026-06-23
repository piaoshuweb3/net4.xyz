// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title Spark_NFT
 * @dev net4.xyz 火种NFT合约 - 代表节点所有权和 DID 身份
 * 
 * 功能特性：
 * - ERC-721 标准实现
 * - 火种等级划分（核心/子/普通节点）
 * - NFT 质押与解锁逻辑
 * - NFT 属性（AI 分身类型、算力等级）
 * - 节点身份绑定
 */
contract Spark_NFT is ERC721, ERC721URIStorage, ERC721Burnable, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    // ============ 枚举定义 ============
    
    /// 火种等级
    enum SparkLevel {
        None,       // 未激活
        Regular,    // 普通节点
        Sub,        // 子节点
        Core        // 核心节点
    }

    /// AI 分身类型
    enum AIAvatarType {
        Light,      // 轻量级 - API 调用
        Medium,     // 中等 - 消费级 GPU
        Advanced    // 高阶 - 专业级 GPU
    }

    /// 算力等级
    enum ComputeLevel {
        L1, // 1-10 TFLOPS
        L2, // 10-50 TFLOPS
        L3, // 50-100 TFLOPS
        L4, // 100-500 TFLOPS
        L5  // 500+ TFLOPS
    }

    /// 质押状态
    enum StakeStatus {
        Unstaked,   // 未质押
        Staked,     // 已质押
        Locked      // 锁定中（不可解除）
    }

    // ============ 常量定义 ============
    
    // 等级价格（以 USDT 计，假设 1 USDT = 1e18）
    uint256 public constant CORE_NODE_PRICE = 10_000 * 1e18;      // 10,000 USDT - 核心节点
    uint256 public constant SUB_NODE_PRICE = 1_000 * 1e18;        // 1,000 USDT - 子节点
    uint256 public constant REGULAR_NODE_PRICE = 100 * 1e18;      // 100 USDT - 普通节点

    // 质押锁定时间
    uint256 public constant CORE_LOCK_PERIOD = 365 days;          // 核心节点锁定 1 年
    uint256 public constant SUB_LOCK_PERIOD = 180 days;           // 子节点锁定 180 天
    uint256 public constant REGULAR_LOCK_PERIOD = 90 days;        // 普通节点锁定 90 天

    // 节点配额
    uint256 public constant MAX_CORE_NODES = 21;
    uint256 public constant MAX_SUB_NODES = 128;
    uint256 public constant MAX_REGULAR_NODES = 10000;

    // ============ 数据结构 ============
    
    /// NFT 属性
    struct SparkAttributes {
        SparkLevel level;           // 火种等级
        AIAvatarType avatarType;    // AI 分身类型
        ComputeLevel computeLevel;  // 算力等级
        string aiNickname;          // AI 分身昵称
        string metadataURI;         // 元数据 URI
        uint256 mintedAt;           // 铸造时间
    }

    /// 质押信息
    struct StakeInfo {
        uint256 tokenId;
        address staker;
        uint256 stakedAt;
        uint256 unlockTime;
        StakeStatus status;
        bool isWrapped;              // 是否为封装版（90天锁定不可转让）
    }

    // ============ 状态变量 ============
    
    Counters.Counter private _tokenIdCounter;
    
    // NFT 属性映射
    mapping(uint256 => SparkAttributes) public sparkAttributes;
    
    // 质押信息映射
    mapping(uint256 => StakeInfo) public stakeInfo;
    
    // 用户拥有的火种数量
    mapping(address => uint256) public balanceOfByLevel;
    
    // 等级配额计数
    uint256 public coreNodeCount;
    uint256 public subNodeCount;
    uint256 public regularNodeCount;
    
    // 节点配额状态
    bool public coreNodeMintingOpen = true;
    bool public subNodeMintingOpen = true;
    bool public regularNodeMintingOpen = true;
    
    // 合约地址（用于验证）
    address public afcTokenAddress;
    
    // ============ 事件 ============
    
    // 铸造事件
    event SparkMinted(
        address indexed to,
        uint256 indexed tokenId,
        SparkLevel level,
        AIAvatarType avatarType,
        ComputeLevel computeLevel
    );
    
    // 质押事件
    event SparkStaked(
        address indexed staker,
        uint256 indexed tokenId,
        uint256 unlockTime
    );
    
    // 解锁事件
    event SparkUnstaked(
        address indexed staker,
        uint256 indexed tokenId,
        uint256 stakedDuration
    );
    
    // 等级升级事件
    event SparkLevelUpgraded(
        uint256 indexed tokenId,
        SparkLevel oldLevel,
        SparkLevel newLevel
    );
    
    // 属性更新事件
    event SparkAttributesUpdated(
        uint256 indexed tokenId,
        string aiNickname,
        string metadataURI
    );
    
    // 配额更新事件
    event QuotaUpdated(
        SparkLevel level,
        bool open
    );
    
    // 节点身份绑定事件
    event NodeIdentityBound(
        uint256 indexed tokenId,
        address indexed nodeAddress,
        string nodeRegion
    );

    // ============ 构造函数 ============
    
    constructor() ERC721("Spark NFT", "SPARK") Ownable() {
        // 初始化
    }

    // ============ 铸造功能 ============
    
    /**
     * @dev 铸造火种 NFT（核心节点）
     * @param to 接收者地址
     * @param avatarType AI 分身类型
     * @param computeLevel 算力等级
     * @param aiNickname AI 分身昵称
     * @param metadataURI 元数据 URI
     */
    function mintCoreNode(
        address to,
        AIAvatarType avatarType,
        ComputeLevel computeLevel,
        string calldata aiNickname,
        string calldata metadataURI
    ) external onlyOwner {
        require(coreNodeMintingOpen, "Core node minting closed");
        require(coreNodeCount < MAX_CORE_NODES, "Core node quota exceeded");
        
        uint256 tokenId = _mintSpark(to, SparkLevel.Core, avatarType, computeLevel, aiNickname, metadataURI);
        
        coreNodeCount++;
    }

    /**
     * @dev 铸造火种 NFT（子节点）
     */
    function mintSubNode(
        address to,
        AIAvatarType avatarType,
        ComputeLevel computeLevel,
        string calldata aiNickname,
        string calldata metadataURI
    ) external onlyOwner {
        require(subNodeMintingOpen, "Sub node minting closed");
        require(subNodeCount < MAX_SUB_NODES, "Sub node quota exceeded");
        
        uint256 tokenId = _mintSpark(to, SparkLevel.Sub, avatarType, computeLevel, aiNickname, metadataURI);
        
        subNodeCount++;
    }

    /**
     * @dev 铸造火种 NFT（普通节点）
     */
    function mintRegularNode(
        address to,
        AIAvatarType avatarType,
        ComputeLevel computeLevel,
        string calldata aiNickname,
        string calldata metadataURI
    ) external onlyOwner {
        require(regularNodeMintingOpen, "Regular node minting closed");
        require(regularNodeCount < MAX_REGULAR_NODES, "Regular node quota exceeded");
        
        uint256 tokenId = _mintSpark(to, SparkLevel.Regular, avatarType, computeLevel, aiNickname, metadataURI);
        
        regularNodeCount++;
    }

    /**
     * @dev 内部铸造方法 - 必须在 mint*Node 函数之前定义
     */
    function _mintSpark(
        address to,
        SparkLevel level,
        AIAvatarType avatarType,
        ComputeLevel computeLevel,
        string calldata aiNickname,
        string calldata metadataURI
    ) internal returns (uint256) {
        require(to != address(0), "Invalid recipient");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);
        
        // 设置属性
        sparkAttributes[tokenId] = SparkAttributes({
            level: level,
            avatarType: avatarType,
            computeLevel: computeLevel,
            aiNickname: aiNickname,
            metadataURI: metadataURI,
            mintedAt: block.timestamp
        });
        
        // 设置 Token URI
        _setTokenURI(tokenId, metadataURI);
        
        // 更新用户等级统计
        balanceOfByLevel[to]++;
        
        emit SparkMinted(to, tokenId, level, avatarType, computeLevel);
        
        return tokenId;
    }

    /**
     * @dev 批量铸造（仅所有者）
     */
    function batchMint(
        address[] calldata recipients,
        SparkLevel[] calldata levels,
        AIAvatarType[] calldata avatarTypes,
        ComputeLevel[] calldata computeLevels,
        string[] calldata aiNicknames,
        string[] calldata metadataURIs
    ) external onlyOwner {
        require(
            recipients.length == levels.length &&
            recipients.length == avatarTypes.length &&
            recipients.length == computeLevels.length &&
            recipients.length == aiNicknames.length &&
            recipients.length == metadataURIs.length,
            "Length mismatch"
        );
        
        for (uint256 i = 0; i < recipients.length; i++) {
            if (levels[i] == SparkLevel.Core) {
                _mintSpark(recipients[i], SparkLevel.Core, avatarTypes[i], computeLevels[i], aiNicknames[i], metadataURIs[i]);
                coreNodeCount++;
            } else if (levels[i] == SparkLevel.Sub) {
                _mintSpark(recipients[i], SparkLevel.Sub, avatarTypes[i], computeLevels[i], aiNicknames[i], metadataURIs[i]);
                subNodeCount++;
            } else if (levels[i] == SparkLevel.Regular) {
                _mintSpark(recipients[i], SparkLevel.Regular, avatarTypes[i], computeLevels[i], aiNicknames[i], metadataURIs[i]);
                regularNodeCount++;
            }
        }
    }

    // ============ 质押功能 ============
    
    /**
     * @dev 质押 NFT
     * @param tokenId 要质押的 NFT ID
     * @param isWrapped 是否为封装版（90天锁定）
     */
    function stake(uint256 tokenId, bool isWrapped) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(stakeInfo[tokenId].status == StakeStatus.Unstaked, "Already staked");
        
        SparkAttributes storage attr = sparkAttributes[tokenId];
        
        // 计算锁定时间
        uint256 lockPeriod;
        if (attr.level == SparkLevel.Core) {
            lockPeriod = CORE_LOCK_PERIOD;
        } else if (attr.level == SparkLevel.Sub) {
            lockPeriod = SUB_LOCK_PERIOD;
        } else {
            lockPeriod = REGULAR_LOCK_PERIOD;
        }
        
        // 如果是封装版，额外增加 90 天锁定
        if (isWrapped) {
            lockPeriod += 90 days;
        }
        
        uint256 unlockTime = block.timestamp + lockPeriod;
        
        // 转移 NFT 到合约
        _transfer(msg.sender, address(this), tokenId);
        
        // 记录质押信息
        stakeInfo[tokenId] = StakeInfo({
            tokenId: tokenId,
            staker: msg.sender,
            stakedAt: block.timestamp,
            unlockTime: unlockTime,
            status: StakeStatus.Locked,
            isWrapped: isWrapped
        });
        
        emit SparkStaked(msg.sender, tokenId, unlockTime);
    }

    /**
     * @dev 解除质押
     * @param tokenId 要解除质押的 NFT ID
     */
    function unstake(uint256 tokenId) external nonReentrant {
        StakeInfo storage info = stakeInfo[tokenId];
        require(info.staker == msg.sender, "Not staker");
        require(info.status == StakeStatus.Locked, "Not locked");
        require(block.timestamp >= info.unlockTime, "Still locked");
        
        // 更新状态
        info.status = StakeStatus.Unstaked;
        
        // 转移 NFT 回用户
        _transfer(address(this), msg.sender, tokenId);
        
        uint256 duration = block.timestamp - info.stakedAt;
        
        emit SparkUnstaked(msg.sender, tokenId, duration);
    }

    /**
     * @dev 紧急解除质押（仅所有者，用于惩罚机制）
     */
    function emergencyUnstake(uint256 tokenId, address recipient) external onlyOwner {
        StakeInfo storage info = stakeInfo[tokenId];
        require(info.status == StakeStatus.Locked, "Not locked");
        
        info.status = StakeStatus.Unstaked;
        _transfer(address(this), recipient, tokenId);
        
        emit SparkUnstaked(recipient, tokenId, block.timestamp - info.stakedAt);
    }

    // ============ 等级升级功能 ============
    
    /**
     * @dev 升级火种等级（普通 -> 子 -> 核心）
     * @param tokenId 要升级的 NFT ID
     */
    function upgradeLevel(uint256 tokenId) external onlyOwner {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        
        SparkAttributes storage attr = sparkAttributes[tokenId];
        SparkLevel oldLevel = attr.level;
        
        require(oldLevel != SparkLevel.Core, "Already at max level");
        
        // 升级逻辑
        if (oldLevel == SparkLevel.Regular) {
            require(subNodeCount < MAX_SUB_NODES, "Sub node quota exceeded");
            attr.level = SparkLevel.Sub;
            subNodeCount++;
            regularNodeCount--;
        } else if (oldLevel == SparkLevel.Sub) {
            require(coreNodeCount < MAX_CORE_NODES, "Core node quota exceeded");
            attr.level = SparkLevel.Core;
            coreNodeCount++;
            subNodeCount--;
        }
        
        emit SparkLevelUpgraded(tokenId, oldLevel, attr.level);
    }

    // ============ 属性更新功能 ============
    
    /**
     * @dev 更新 NFT 属性
     * @param tokenId NFT ID
     * @param aiNickname 新的 AI 分身昵称
     * @param metadataURI 新的元数据 URI
     */
    function updateAttributes(
        uint256 tokenId,
        string calldata aiNickname,
        string calldata metadataURI
    ) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        
        SparkAttributes storage attr = sparkAttributes[tokenId];
        attr.aiNickname = aiNickname;
        attr.metadataURI = metadataURI;
        
        _setTokenURI(tokenId, metadataURI);
        
        emit SparkAttributesUpdated(tokenId, aiNickname, metadataURI);
    }

    // ============ 节点身份绑定功能 ============
    
    /**
     * @dev 绑定节点身份
     * @param tokenId NFT ID
     * @param nodeAddress 节点地址
     * @param nodeRegion 节点地区
     */
    function bindNodeIdentity(
        uint256 tokenId,
        address nodeAddress,
        string calldata nodeRegion
    ) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        
        emit NodeIdentityBound(tokenId, nodeAddress, nodeRegion);
    }

    // ============ 配额管理功能 ============
    
    /**
     * @dev 设置节点铸造状态
     */
    function setMintingStatus(SparkLevel level, bool open) external onlyOwner {
        if (level == SparkLevel.Core) {
            coreNodeMintingOpen = open;
        } else if (level == SparkLevel.Sub) {
            subNodeMintingOpen = open;
        } else if (level == SparkLevel.Regular) {
            regularNodeMintingOpen = open;
        }
        
        emit QuotaUpdated(level, open);
    }

    // ============ 查询功能 ============
    
    /**
     * @dev 获取 NFT 完整属性
     */
    function getSparkAttributes(uint256 tokenId) external view returns (SparkAttributes memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return sparkAttributes[tokenId];
    }

    /**
     * @dev 获取质押信息
     */
    function getStakeInfo(uint256 tokenId) external view returns (StakeInfo memory) {
        return stakeInfo[tokenId];
    }

    /**
     * @dev 获取用户各等级火种数量
     */
    function getUserSparkCount(address user) external view returns (
        uint256 core,
        uint256 sub,
        uint256 regular
    ) {
        uint256 total = balanceOfByLevel[user];
        // 这里简化处理，实际需要更复杂的追踪
        return (coreNodeCount, subNodeCount, regularNodeCount);
    }

    /**
     * @dev 获取当前配额状态
     */
    function getQuotaStatus() external view returns (
        uint256 coreAvailable,
        uint256 subAvailable,
        uint256 regularAvailable
    ) {
        return (
            MAX_CORE_NODES - coreNodeCount,
            MAX_SUB_NODES - subNodeCount,
            MAX_REGULAR_NODES - regularNodeCount
        );
    }

    /**
     * @dev 检查 NFT 是否可转让
     */
    function isTransferable(uint256 tokenId) external view returns (bool) {
        StakeInfo storage info = stakeInfo[tokenId];
        if (info.status == StakeStatus.Unstaked) {
            return !info.isWrapped || (block.timestamp >= info.unlockTime);
        }
        return false;
    }

    // ============ 合约管理功能 ============
    
    /**
     * @dev 设置 AFC 代币地址
     */
    function setAFCTokenAddress(address _afcTokenAddress) external onlyOwner {
        afcTokenAddress = _afcTokenAddress;
    }

    /**
     * @dev 紧急提取代币（仅所有者）
     */
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        require(to != address(0), "Invalid address");
        
        if (token == address(0)) {
            payable(to).transfer(amount);
        } else {
            IERC721(token).transferFrom(address(this), to, amount);
        }
    }

    // ============ ERC-721 覆盖方法 ============
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev 重写 _burn 函数以清理属性数据
     */
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
        delete sparkAttributes[tokenId];
        delete stakeInfo[tokenId];
    }

    /**
     * @dev 重写转账逻辑，防止质押中的 NFT 被转让
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        // 如果是转入合约（质押），允许
        if (to == address(this)) {
            return;
        }
        
        // 如果是从合约转出（解除质押），允许
        if (from == address(this)) {
            return;
        }
        
        // 其他情况检查质押状态
        StakeInfo storage info = stakeInfo[tokenId];
        if (info.status == StakeStatus.Locked) {
            require(!info.isWrapped || block.timestamp >= info.unlockTime, "NFT is locked");
        }
    }

    // 接收 ETH
    receive() external payable {}
}