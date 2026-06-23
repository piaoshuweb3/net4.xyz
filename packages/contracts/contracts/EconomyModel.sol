// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title EconomyModel
 * @dev net4.xyz 经济模型合约 - 火种 NFT 销售、收益分配、锁定期、动态定价
 * 
 * 功能特性：
 * - 火种 NFT 销售（支持 USDT 支付）
 * - 收益分配机制（团队/生态/回购）
 * - 锁定期逻辑（不同等级节点不同锁定）
 * - 动态定价机制（基于供需关系）
 * - 证券属性规避（购买的是 NFT 使用权，非投资凭证）
 * 
 * Requirements: 4.1, 10.2
 */
contract EconomyModel is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Address for address payable;

    // ============ 枚举定义 ============
    
    /// 火种等级
    enum SparkLevel {
        None,       // 未激活
        Regular,    // 普通节点 - $99
        Sub,        // 子节点 - $999
        Core        // 核心节点 - $9,999
    }

    /// 销售阶段
    enum SalePhase {
        Closed,     // 关闭
        Presale,    // 预售
        PublicSale, // 公开销售
        FlashSale   // 限时抢购
    }

    // ============ 常量定义 ============
    
    // 基础价格（以 USDT 计，1e18）
    uint256 public constant BASE_PRICE_REGULAR = 99 * 1e18;      // $99
    uint256 public constant BASE_PRICE_SUB = 999 * 1e18;         // $999
    uint256 public constant BASE_PRICE_CORE = 9999 * 1e18;       // $9,999

    // 节点配额
    uint256 public constant MAX_CORE_NODES = 21;
    uint256 public constant MAX_SUB_NODES = 128;
    uint256 public constant MAX_REGULAR_NODES = 10000;

    // 锁定时间
    uint256 public constant CORE_LOCK_PERIOD = 365 days;
    uint256 public constant SUB_LOCK_PERIOD = 180 days;
    uint256 public constant REGULAR_LOCK_PERIOD = 90 days;
    uint256 public constant WRAPPED_LOCK_EXTENSION = 90 days;   // 封装版额外锁定

    // 收益分配比例（基数为 10000，1% = 100）
    uint256 public constant TEAM_SHARE = 2000;      // 20% - 团队
    uint256 public constant ECOSYSTEM_SHARE = 3000; // 30% - 生态基金
    uint256 public constant BUYBACK_SHARE = 2000;   // 20% - 回购
    uint256 public constant RESERVE_SHARE = 3000;   // 30% - 储备

    // 动态定价参数
    uint256 public constant PRICE_MIN_DISCOUNT = 7000;  // 最低 70% (30% off)
    uint256 public constant PRICE_MAX_PREMIUM = 13000;  // 最高 130% (30% premium)
    uint256 public constant PRICE_ADJUSTMENT_FACTOR = 100; // 价格调整因子

    // ============ 状态变量 ============
    
    // USDT 代币地址
    address public usdtToken;
    
    // Spark NFT 合约地址
    address public sparkNFTAddress;
    
    // 销售阶段
    SalePhase public currentPhase = SalePhase.Closed;
    
    // 节点配额计数
    uint256 public coreNodeSold;
    uint256 public subNodeSold;
    uint256 public regularNodeSold;
    
    // 销售统计
    uint256 public totalRevenue;
    uint256 public totalNodesSold;
    
    // 动态定价参数
    uint256 public priceMultiplier = 10000; // 10000 = 1x
    uint256 public lastPriceUpdate;
    uint256 public priceUpdateInterval = 1 days;
    
    // 收益接收者地址
    address public teamWallet;
    address public ecosystemWallet;
    address public buybackWallet;
    address public reserveWallet;
    
    // 销售记录
    struct PurchaseRecord {
        address buyer;
        SparkLevel level;
        uint256 price;
        uint256 purchasedAt;
        bool isWrapped;
        uint256 unlockTime;
    }
    mapping(address => PurchaseRecord[]) public purchaseHistory;
    mapping(address => uint256[]) public userPurchases;
    
    // 封装的 NFT（90天锁定不可转让）
    mapping(uint256 => bool) public wrappedTokens;
    mapping(address => uint256) public wrappedTokenCount;
    
    // 动态定价参数
    uint256 public baseDemand = 1000;  // 基础需求量
    int256 public demandOffset;        // 需求偏移量
    
    // 黑名单（用于合规）
    mapping(address => bool) public blacklist;
    bool public blacklistEnabled = true;

    // ============ 事件 ============
    
    // 销售事件
    event SaleStarted(SalePhase phase);
    event SaleEnded();
    event SparkPurchased(
        address indexed buyer,
        uint256 indexed tokenId,
        SparkLevel level,
        uint256 price,
        bool isWrapped
    );
    
    // 定价事件
    event PriceUpdated(uint256 oldMultiplier, uint256 newMultiplier);
    event DynamicPricingEnabled(bool enabled);
    
    // 收益分配事件
    event RevenueDistributed(
        uint256 totalAmount,
        uint256 teamAmount,
        uint256 ecosystemAmount,
        uint256 buybackAmount,
        uint256 reserveAmount
    );
    
    // 锁定事件
    event TokenLocked(
        address indexed buyer,
        uint256 indexed tokenId,
        uint256 unlockTime,
        bool isWrapped
    );
    event TokenUnlocked(address indexed buyer, uint256 indexed tokenId);
    
    // 合规事件
    event BlacklistUpdated(address indexed account, bool status);
    event ComplianceCheck(address indexed buyer, bool passed);

    // ============ 构造函数 ============
    
    constructor(
        address _usdtToken,
        address _sparkNFTAddress,
        address _teamWallet,
        address _ecosystemWallet,
        address _buybackWallet,
        address _reserveWallet
    ) Ownable() {
        require(_usdtToken != address(0), "Invalid USDT address");
        require(_sparkNFTAddress != address(0), "Invalid Spark NFT address");
        
        usdtToken = _usdtToken;
        sparkNFTAddress = _sparkNFTAddress;
        teamWallet = _teamWallet;
        ecosystemWallet = _ecosystemWallet;
        buybackWallet = _buybackWallet;
        reserveWallet = _reserveWallet;
        
        lastPriceUpdate = block.timestamp;
    }

    // ============ 销售功能 ============
    
    /**
     * @dev 购买火种 NFT（公开销售）
     * @param level 节点等级
     * @param isWrapped 是否为封装版（90天锁定）
     */
    function purchaseSpark(SparkLevel level, bool isWrapped) external nonReentrant {
        require(currentPhase != SalePhase.Closed, "Sale not open");
        require(!blacklistEnabled || !blacklist[msg.sender], "Address blocked");
        
        // 检查配额
        _checkQuota(level);
        
        // 计算价格
        uint256 price = getCurrentPrice(level);
        require(price > 0, "Invalid price");
        
        // 检查用户是否超过单次购买限制
        uint256 userPurchaseCount = userPurchases[msg.sender].length;
        require(userPurchaseCount < 10, "Purchase limit exceeded");
        
        // 从用户接收 USDT
        IERC20(usdtToken).safeTransferFrom(msg.sender, address(this), price);
        
        // 调用 Spark NFT 合约铸造
        uint256 tokenId = _mintSparkNFT(msg.sender, level, isWrapped);
        
        // 记录购买
        _recordPurchase(msg.sender, level, price, tokenId, isWrapped);
        
        // 更新销售统计
        _updateSalesStats(level);
        
        // 更新动态定价
        _updateDynamicPrice(true); // 需求增加
        
        emit SparkPurchased(msg.sender, tokenId, level, price, isWrapped);
    }

    /**
     * @dev 批量购买火种 NFT
     * @param levels 节点等级数组
     * @param isWrapped 是否为封装版数组
     */
    function batchPurchase(SparkLevel[] calldata levels, bool[] calldata isWrapped) external nonReentrant {
        require(levels.length == isWrapped.length, "Length mismatch");
        require(levels.length > 0 && levels.length <= 10, "Invalid batch size");
        require(currentPhase != SalePhase.Closed, "Sale not open");
        
        uint256 totalPrice = 0;
        
        for (uint256 i = 0; i < levels.length; i++) {
            _checkQuota(levels[i]);
            totalPrice += getCurrentPrice(levels[i]);
        }
        
        // 一次性扣除总金额
        IERC20(usdtToken).safeTransferFrom(msg.sender, address(this), totalPrice);
        
        for (uint256 i = 0; i < levels.length; i++) {
            uint256 tokenId = _mintSparkNFT(msg.sender, levels[i], isWrapped[i]);
            _recordPurchase(msg.sender, levels[i], getCurrentPrice(levels[i]), tokenId, isWrapped[i]);
            _updateSalesStats(levels[i]);
        }
        
        // 更新动态定价
        _updateDynamicPrice(true);
        
        totalRevenue += totalPrice;
        totalNodesSold += levels.length;
    }

    /**
     * @dev 铸造 NFT（内部函数）
     */
    function _mintSparkNFT(
        address to,
        SparkLevel level,
        bool isWrapped
    ) internal returns (uint256) {
        // 调用 Spark NFT 合约的铸造函数
        // 这里简化处理，实际需要通过接口调用
        // 假设返回 tokenId
        uint256 tokenId = _getNextTokenId();
        
        // 如果是封装版，记录锁定信息
        if (isWrapped) {
            wrappedTokens[tokenId] = true;
            wrappedTokenCount[to]++;
        }
        
        return tokenId;
    }

    /**
     * @dev 获取下一个 Token ID
     */
    function _getNextTokenId() internal view returns (uint256) {
        return totalNodesSold;
    }

    /**
     * @dev 记录购买历史
     */
    function _recordPurchase(
        address buyer,
        SparkLevel level,
        uint256 price,
        uint256 tokenId,
        bool isWrapped
    ) internal {
        uint256 unlockTime = _calculateUnlockTime(level, isWrapped);
        
        purchaseHistory[buyer].push(PurchaseRecord({
            buyer: buyer,
            level: level,
            price: price,
            purchasedAt: block.timestamp,
            isWrapped: isWrapped,
            unlockTime: unlockTime
        }));
        
        userPurchases[buyer].push(tokenId);
        
        emit TokenLocked(buyer, tokenId, unlockTime, isWrapped);
    }

    /**
     * @dev 计算解锁时间
     */
    function _calculateUnlockTime(SparkLevel level, bool isWrapped) internal view returns (uint256) {
        uint256 lockPeriod;
        
        if (level == SparkLevel.Core) {
            lockPeriod = CORE_LOCK_PERIOD;
        } else if (level == SparkLevel.Sub) {
            lockPeriod = SUB_LOCK_PERIOD;
        } else {
            lockPeriod = REGULAR_LOCK_PERIOD;
        }
        
        if (isWrapped) {
            lockPeriod += WRAPPED_LOCK_EXTENSION;
        }
        
        return block.timestamp + lockPeriod;
    }

    /**
     * @dev 检查配额
     */
    function _checkQuota(SparkLevel level) internal view {
        if (level == SparkLevel.Core) {
            require(coreNodeSold < MAX_CORE_NODES, "Core node sold out");
        } else if (level == SparkLevel.Sub) {
            require(subNodeSold < MAX_SUB_NODES, "Sub node sold out");
        } else {
            require(regularNodeSold < MAX_REGULAR_NODES, "Regular node sold out");
        }
    }

    /**
     * @dev 更新销售统计
     */
    function _updateSalesStats(SparkLevel level) internal {
        if (level == SparkLevel.Core) {
            coreNodeSold++;
        } else if (level == SparkLevel.Sub) {
            subNodeSold++;
        } else {
            regularNodeSold++;
        }
        totalNodesSold++;
    }

    // ============ 动态定价功能 ============
    
    /**
     * @dev 获取当前价格（动态定价）
     * @param level 节点等级
     */
    function getCurrentPrice(SparkLevel level) public view returns (uint256) {
        uint256 basePrice;
        
        if (level == SparkLevel.Core) {
            basePrice = BASE_PRICE_CORE;
        } else if (level == SparkLevel.Sub) {
            basePrice = BASE_PRICE_SUB;
        } else {
            basePrice = BASE_PRICE_REGULAR;
        }
        
        // 应用价格乘数
        return (basePrice * priceMultiplier) / 10000;
    }

    /**
     * @dev 获取所有等级的价格
     */
    function getAllPrices() external view returns (
        uint256 regularPrice,
        uint256 subPrice,
        uint256 corePrice
    ) {
        regularPrice = getCurrentPrice(SparkLevel.Regular);
        subPrice = getCurrentPrice(SparkLevel.Sub);
        corePrice = getCurrentPrice(SparkLevel.Core);
    }

    /**
     * @dev 更新动态定价
     * @param demandIncrease 是否需求增加
     */
    function _updateDynamicPrice(bool demandIncrease) internal {
        if (block.timestamp - lastPriceUpdate < priceUpdateInterval) {
            return;
        }
        
        uint256 oldMultiplier = priceMultiplier;
        
        // 计算当前供应量
        uint256 totalSupply = coreNodeSold + subNodeSold + regularNodeSold;
        if (totalSupply == 0) totalSupply = 1;
        
        // 计算需求比率
        int256 demandRatio = int256(baseDemand * 10000) / int256(totalSupply);
        
        // 调整价格乘数
        if (demandIncrease) {
            demandOffset += int256(PRICE_ADJUSTMENT_FACTOR);
        } else {
            demandOffset -= int256(PRICE_ADJUSTMENT_FACTOR);
        }
        
        // 计算新的乘数
        int256 newMultiplier = 10000 + (demandOffset * demandRatio) / 10000;
        
        // 限制价格范围
        if (newMultiplier < int256(PRICE_MIN_DISCOUNT)) {
            newMultiplier = int256(PRICE_MIN_DISCOUNT);
        } else if (newMultiplier > int256(PRICE_MAX_PREMIUM)) {
            newMultiplier = int256(PRICE_MAX_PREMIUM);
        }
        
        priceMultiplier = uint256(newMultiplier);
        lastPriceUpdate = block.timestamp;
        
        emit PriceUpdated(oldMultiplier, priceMultiplier);
    }

    /**
     * @dev 手动调整价格乘数（仅管理员）
     */
    function setPriceMultiplier(uint256 _multiplier) external onlyOwner {
        require(_multiplier >= PRICE_MIN_DISCOUNT, "Multiplier too low");
        require(_multiplier <= PRICE_MAX_PREMIUM, "Multiplier too high");
        
        uint256 oldMultiplier = priceMultiplier;
        priceMultiplier = _multiplier;
        
        emit PriceUpdated(oldMultiplier, priceMultiplier);
    }

    /**
     * @dev 设置价格更新间隔
     */
    function setPriceUpdateInterval(uint256 _interval) external onlyOwner {
        require(_interval > 0, "Invalid interval");
        priceUpdateInterval = _interval;
    }

    // ============ 收益分配功能 ============
    
    /**
     * @dev 分配收益
     * 将收益分配到不同的钱包地址
     */
    function distributeRevenue() external onlyOwner nonReentrant {
        uint256 balance = IERC20(usdtToken).balanceOf(address(this));
        require(balance > 0, "No revenue to distribute");
        
        uint256 teamAmount = (balance * TEAM_SHARE) / 10000;
        uint256 ecosystemAmount = (balance * ECOSYSTEM_SHARE) / 10000;
        uint256 buybackAmount = (balance * BUYBACK_SHARE) / 10000;
        uint256 reserveAmount = (balance * RESERVE_SHARE) / 10000;
        
        // 分配到各个钱包
        IERC20(usdtToken).safeTransfer(teamWallet, teamAmount);
        IERC20(usdtToken).safeTransfer(ecosystemWallet, ecosystemAmount);
        IERC20(usdtToken).safeTransfer(buybackWallet, buybackAmount);
        IERC20(usdtToken).safeTransfer(reserveWallet, reserveAmount);
        
        totalRevenue += balance;
        
        // 更新动态定价（需求减少，因为资金被分配）
        _updateDynamicPrice(false);
        
        emit RevenueDistributed(
            balance,
            teamAmount,
            ecosystemAmount,
            buybackAmount,
            reserveAmount
        );
    }

    /**
     * @dev 获取当前收益分配预览
     */
    function getRevenueDistributionPreview() external view returns (
        uint256 balance,
        uint256 teamAmount,
        uint256 ecosystemAmount,
        uint256 buybackAmount,
        uint256 reserveAmount
    ) {
        balance = IERC20(usdtToken).balanceOf(address(this));
        
        teamAmount = (balance * TEAM_SHARE) / 10000;
        ecosystemAmount = (balance * ECOSYSTEM_SHARE) / 10000;
        buybackAmount = (balance * BUYBACK_SHARE) / 10000;
        reserveAmount = (balance * RESERVE_SHARE) / 10000;
    }

    // ============ 销售阶段管理 ============
    
    /**
     * @dev 开始销售
     */
    function startSale(SalePhase phase) external onlyOwner {
        require(phase != SalePhase.Closed, "Use endSale");
        currentPhase = phase;
        
        emit SaleStarted(phase);
    }

    /**
     * @dev 结束销售
     */
    function endSale() external onlyOwner {
        currentPhase = SalePhase.Closed;
        
        emit SaleEnded();
    }

    // ============ 配额查询 ============
    
    /**
     * @dev 获取配额状态
     */
    function getQuotaStatus() external view returns (
        uint256 coreAvailable,
        uint256 subAvailable,
        uint256 regularAvailable,
        uint256 coreSold,
        uint256 subSold,
        uint256 regularSold
    ) {
        return (
            MAX_CORE_NODES - coreNodeSold,
            MAX_SUB_NODES - subNodeSold,
            MAX_REGULAR_NODES - regularNodeSold,
            coreNodeSold,
            subNodeSold,
            regularNodeSold
        );
    }

    // ============ 购买历史查询 ============
    
    /**
     * @dev 获取用户购买数量
     */
    function getUserPurchaseCount(address user) external view returns (uint256) {
        return userPurchases[user].length;
    }

    /**
     * @dev 获取用户购买记录
     */
    function getUserPurchases(address user) external view returns (PurchaseRecord[] memory) {
        return purchaseHistory[user];
    }

    /**
     * @dev 检查 Token 是否为封装版
     */
    function isWrappedToken(uint256 tokenId) external view returns (bool) {
        return wrappedTokens[tokenId];
    }

    // ============ 合规功能 ============
    
    /**
     * @dev 设置黑名单状态
     */
    function setBlacklist(address account, bool status) external onlyOwner {
        blacklist[account] = status;
        
        emit BlacklistUpdated(account, status);
    }

    /**
     * @dev 批量设置黑名单
     */
    function batchSetBlacklist(address[] calldata accounts, bool status) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            blacklist[accounts[i]] = status;
            emit BlacklistUpdated(accounts[i], status);
        }
    }

    /**
     * @dev 启用/禁用黑名单检查
     */
    function setBlacklistEnabled(bool enabled) external onlyOwner {
        blacklistEnabled = enabled;
        
        emit DynamicPricingEnabled(enabled);
    }

    /**
     * @dev 合规检查
     */
    function checkCompliance(address buyer) external view returns (bool) {
        if (blacklistEnabled && blacklist[buyer]) {
            return false;
        }
        
        // 检查购买限制
        uint256 userPurchaseCount = userPurchases[buyer].length;
        if (userPurchaseCount >= 10) {
            return false;
        }
        
        return true;
    }

    // ============ 钱包管理 ============
    
    /**
     * @dev 更新收益接收钱包
     */
    function updateWallets(
        address _teamWallet,
        address _ecosystemWallet,
        address _buybackWallet,
        address _reserveWallet
    ) external onlyOwner {
        require(_teamWallet != address(0), "Invalid team wallet");
        require(_ecosystemWallet != address(0), "Invalid ecosystem wallet");
        require(_buybackWallet != address(0), "Invalid buyback wallet");
        require(_reserveWallet != address(0), "Invalid reserve wallet");
        
        teamWallet = _teamWallet;
        ecosystemWallet = _ecosystemWallet;
        buybackWallet = _buybackWallet;
        reserveWallet = _reserveWallet;
    }

    // ============ 紧急提取 ============
    
    /**
     * @dev 紧急提取代币
     */
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        require(to != address(0), "Invalid address");
        
        if (token == address(0)) {
            payable(to).sendValue(amount);
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    // 接收 ETH
    receive() external payable {}
}