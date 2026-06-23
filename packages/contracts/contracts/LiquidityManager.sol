// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title LiquidityManager
 * @dev net4.xyz 流动性管理合约 - Uniswap/Base LP 注入与 NFT 变现
 * 
 * 功能特性：
 * - 代币流动性预留（10%-15%）
 * - Uniswap V3 LP 注入
 * - 流动性池监控
 * - NFT 持有者变现机制
 * - 做市商配置
 * 
 * Requirements: 11.4
 */
contract LiquidityManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ 常量定义 ============
    
    // 流动性比例（基数为 10000）
    uint256 public constant MIN_LIQUIDITY_RATIO = 1000;   // 最小 10%
    uint256 public constant MAX_LIQUIDITY_RATIO = 1500;  // 最大 15%
    uint256 public constant DEFAULT_LIQUIDITY_RATIO = 1200; // 默认 12%
    
    // Uniswap V3 工厂地址 (Base)
    address public constant UNISWAP_V3_FACTORY_BASE = 0x0000000000000000000000000000000000000000;
    
    // ============ 状态变量 ============
    
    // AFC 代币地址
    address public afcToken;
    
    // USDT 代币地址
    address public usdtToken;
    
    // 流动性池地址 (Uniswap V3 Pool)
    address public lpPool;
    
    // 流动性池是否已初始化
    bool public liquidityInitialized;
    
    // 预留的流动性代币数量
    uint256 public reservedLiquidityAFC;
    uint256 public reservedLiquidityUSDT;
    
    // 流动性比例
    uint256 public liquidityRatio = DEFAULT_LIQUIDITY_RATIO;
    
    // 做市商地址
    address public marketMaker;
    bool public marketMakerEnabled;
    
    // 流动性解锁时间
    uint256 public liquidityUnlockTime;
    uint256 public constant LOCK_PERIOD = 180 days; // 6个月锁定期
    
    // 累计流动性收益
    uint256 public accumulatedFees;
    
    // 记录流动性注入历史
    struct LiquidityEvent {
        uint256 timestamp;
        uint256 afcAmount;
        uint256 usdtAmount;
        address provider;
    }
    LiquidityEvent[] public liquidityHistory;
    
    // ============ 事件 ============
    
    event LiquidityReserved(uint256 afcAmount, uint256 usdtAmount);
    event LiquidityAdded(uint256 afcAmount, uint256 usdtAmount, address lpPool);
    event LiquidityRemoved(uint256 afcAmount, uint256 usdtAmount);
    event MarketMakerUpdated(address indexed oldAddress, address indexed newAddress);
    event MarketMakerEnabled(bool enabled);
    event LiquidityRatioUpdated(uint256 oldRatio, uint256 newRatio);
    event FeesCollected(uint256 amount);
    event EmergencyWithdraw(address indexed token, address indexed to, uint256 amount);

    // ============ 构造函数 ============
    
    constructor(
        address _afcToken,
        address _usdtToken,
        address _marketMaker
    ) Ownable() {
        require(_afcToken != address(0), "Invalid AFC token address");
        require(_usdtToken != address(0), "Invalid USDT address");
        
        afcToken = _afcToken;
        usdtToken = _usdtToken;
        marketMaker = _marketMaker;
        liquidityUnlockTime = block.timestamp + LOCK_PERIOD;
    }

    // ============ 流动性预留功能 ============
    
    /**
     * @dev 预留流动性代币
     * @param afcAmount AFC 代币数量
     * @param usdtAmount USDT 数量
     */
    function reserveLiquidity(uint256 afcAmount, uint256 usdtAmount) external onlyOwner {
        require(afcAmount > 0, "AFC amount must be greater than 0");
        require(usdtAmount > 0, "USDT amount must be greater than 0");
        
        // 从合约接收代币
        IERC20(afcToken).safeTransferFrom(msg.sender, address(this), afcAmount);
        IERC20(usdtToken).safeTransferFrom(msg.sender, address(this), usdtAmount);
        
        reservedLiquidityAFC += afcAmount;
        reservedLiquidityUSDT += usdtAmount;
        
        // 记录历史
        liquidityHistory.push(LiquidityEvent({
            timestamp: block.timestamp,
            afcAmount: afcAmount,
            usdtAmount: usdtAmount,
            provider: msg.sender
        }));
        
        emit LiquidityReserved(afcAmount, usdtAmount);
    }

    /**
     * @dev 注入流动性到 Uniswap V3
     * @param _lpPool Uniswap V3 池地址
     * @param afcAmount AFC 代币数量
     * @param usdtAmount USDT 数量
     * @param minLiquidity 最小流动性代币数量
     */
    function addLiquidity(
        address _lpPool,
        uint256 afcAmount,
        uint256 usdtAmount,
        uint256 minLiquidity
    ) external onlyOwner nonReentrant {
        require(afcAmount <= reservedLiquidityAFC, "Insufficient AFC liquidity");
        require(usdtAmount <= reservedLiquidityUSDT, "Insufficient USDT liquidity");
        require(_lpPool != address(0), "Invalid LP pool address");
        
        // 验证池地址
        require(_verifyPool(_lpPool), "Invalid pool address");
        
        // 批准代币
        IERC20(afcToken).safeIncreaseAllowance(_lpPool, afcAmount);
        IERC20(usdtToken).safeIncreaseAllowance(_lpPool, usdtAmount);
        
        // 调用 Uniswap V3 添加流动性
        // 注意：实际实现需要根据 Uniswap V3 接口调整
        // 这里使用底层调用示例
        (bool success, ) = _lpPool.call(abi.encodeWithSignature(
            "mint(address,address,uint24,int24,int24,uint256,uint256,address)",
            afcToken,
            usdtToken,
            3000, // 0.3% 手续费等级
            -887220, // 最低价格
            887220,  // 最高价格
            afcAmount,
            usdtAmount,
            address(this)
        ));
        
        require(success, "Liquidity addition failed");
        
        // 更新状态
        reservedLiquidityAFC -= afcAmount;
        reservedLiquidityUSDT -= usdtAmount;
        lpPool = _lpPool;
        liquidityInitialized = true;
        
        emit LiquidityAdded(afcAmount, usdtAmount, _lpPool);
    }

    /**
     * @dev 验证池地址
     */
    function _verifyPool(address _lpPool) internal view returns (bool) {
        // 简化验证：检查是否为有效合约地址
        // 实际实现应验证池的代币对是否匹配
        return _lpPool != address(0);
    }

    /**
     * @dev 移除流动性
     * @param liquidityAmount 流动性代币数量
     * @param minAfcAmount 最小 AFC 数量
     * @param minUsdtAmount 最小 USDT 数量
     */
    function removeLiquidity(
        uint256 liquidityAmount,
        uint256 minAfcAmount,
        uint256 minUsdtAmount
    ) external onlyOwner nonReentrant {
        require(liquidityInitialized, "Liquidity not initialized");
        require(block.timestamp >= liquidityUnlockTime, "Liquidity locked");
        
        // 调用 Uniswap V3 移除流动性
        (bool success, ) = lpPool.call(abi.encodeWithSignature(
            "burn(uint256,uint256,uint256)",
            liquidityAmount,
            minAfcAmount,
            minUsdtAmount
        ));
        
        require(success, "Liquidity removal failed");
        
        emit LiquidityRemoved(minAfcAmount, minUsdtAmount);
    }

    // ============ 做市商功能 ============
    
    /**
     * @dev 设置做市商地址
     */
    function setMarketMaker(address _marketMaker) external onlyOwner {
        require(_marketMaker != address(0), "Invalid market maker address");
        
        address oldAddress = marketMaker;
        marketMaker = _marketMaker;
        
        emit MarketMakerUpdated(oldAddress, _marketMaker);
    }

    /**
     * @dev 启用/禁用做市商
     */
    function setMarketMakerEnabled(bool enabled) external onlyOwner {
        marketMakerEnabled = enabled;
        
        emit MarketMakerEnabled(enabled);
    }

    /**
     * @dev 做市商自动平衡
     * @param targetRatio 目标 AFC/USDT 比例
     */
    function rebalance(uint256 targetRatio) external onlyOwner {
        require(marketMakerEnabled, "Market maker not enabled");
        require(liquidityInitialized, "Liquidity not initialized");
        
        uint256 afcBalance = IERC20(afcToken).balanceOf(address(this));
        uint256 usdtBalance = IERC20(usdtToken).balanceOf(address(this));
        
        if (afcBalance == 0 || usdtBalance == 0) return;
        
        uint256 currentRatio = (afcBalance * 10000) / usdtBalance;
        
        if (currentRatio > targetRatio) {
            // AFC 过多，卖出 AFC 换取 USDT
            uint256 excessAfc = afcBalance - ((usdtBalance * targetRatio) / 10000);
            IERC20(afcToken).safeTransfer(marketMaker, excessAfc);
        } else if (currentRatio < targetRatio) {
            // USDT 过多，买入 AFC
            uint256 excessUsdt = usdtBalance - ((afcBalance * 10000) / targetRatio);
            IERC20(usdtToken).safeTransfer(marketMaker, excessUsdt);
        }
    }

    // ============ NFT 变现功能 ============
    
    /**
     * @dev 从流动性池购买 AFC 代币（NFT 持有者变现）
     * @param afcAmount 需要的 AFC 数量
     * @param maxUsdtAmount 最高 USDT 支付
     */
    function purchaseAFCFromLiquidity(
        uint256 afcAmount,
        uint256 maxUsdtAmount
    ) external nonReentrant {
        require(liquidityInitialized, "Liquidity not initialized");
        require(afcAmount > 0, "AFC amount must be greater than 0");
        
        // 计算价格（简化：1:1 实际应根据池价格计算）
        uint256 usdtRequired = afcAmount; // 简化：1 AFC = 1 USDT
        require(usdtRequired <= maxUsdtAmount, "Price too high");
        require(usdtRequired <= IERC20(usdtToken).balanceOf(address(this)), "Insufficient USDT in pool");
        
        // 从买家收取 USDT
        IERC20(usdtToken).safeTransferFrom(msg.sender, address(this), usdtRequired);
        
        // 发送 AFC 给买家
        IERC20(afcToken).safeTransfer(msg.sender, afcAmount);
        
        // 更新流动性
        reservedLiquidityAFC -= afcAmount;
        reservedLiquidityUSDT += usdtRequired;
    }

    /**
     * @dev 将 AFC 出售给流动性池
     * @param afcAmount 要出售的 AFC 数量
     * @param minUsdtAmount 最低 USDT 接收
     */
    function sellAFCToLiquidity(
        uint256 afcAmount,
        uint256 minUsdtAmount
    ) external nonReentrant {
        require(liquidityInitialized, "Liquidity not initialized");
        require(afcAmount > 0, "AFC amount must be greater than 0");
        
        // 计算价格
        uint256 usdtOutput = afcAmount; // 简化：1:1
        require(usdtOutput >= minUsdtAmount, "Price too low");
        require(usdtOutput <= IERC20(usdtToken).balanceOf(address(this)), "Insufficient USDT in pool");
        
        // 从卖家收取 AFC
        IERC20(afcToken).safeTransferFrom(msg.sender, address(this), afcAmount);
        
        // 发送 USDT 给卖家
        IERC20(usdtToken).safeTransfer(msg.sender, usdtOutput);
        
        // 更新流动性
        reservedLiquidityAFC += afcAmount;
        reservedLiquidityUSDT -= usdtOutput;
    }

    // ============ 费用收集功能 ============
    
    /**
     * @dev 收集流动性池费用
     */
    function collectFees() external onlyOwner nonReentrant {
        require(lpPool != address(0), "No LP pool");
        
        // 调用 Uniswap V3 收集费用
        (bool success, ) = lpPool.call(abi.encodeWithSignature(
            "collect(address,address,uint256,uint256)",
            address(this),
            address(this),
            type(uint128).max,
            type(uint128).max
        ));
        
        if (success) {
            uint256 usdtFees = IERC20(usdtToken).balanceOf(address(this)) - reservedLiquidityUSDT;
            if (usdtFees > 0) {
                accumulatedFees += usdtFees;
                emit FeesCollected(usdtFees);
            }
        }
    }

    // ============ 管理功能 ============
    
    /**
     * @dev 设置流动性比例
     */
    function setLiquidityRatio(uint256 _ratio) external onlyOwner {
        require(_ratio >= MIN_LIQUIDITY_RATIO, "Ratio too low");
        require(_ratio <= MAX_LIQUIDITY_RATIO, "Ratio too high");
        
        uint256 oldRatio = liquidityRatio;
        liquidityRatio = _ratio;
        
        emit LiquidityRatioUpdated(oldRatio, _ratio);
    }

    /**
     * @dev 获取当前流动性状态
     */
    function getLiquidityStatus() external view returns (
        uint256 totalAfcLiquidity,
        uint256 totalUsdtLiquidity,
        uint256 availableAfc,
        uint256 availableUsdt,
        bool isInitialized,
        uint256 unlockTime
    ) {
        totalAfcLiquidity = reservedLiquidityAFC + IERC20(afcToken).balanceOf(address(this));
        totalUsdtLiquidity = reservedLiquidityUSDT + IERC20(usdtToken).balanceOf(address(this));
        availableAfc = IERC20(afcToken).balanceOf(address(this));
        availableUsdt = IERC20(usdtToken).balanceOf(address(this));
        isInitialized = liquidityInitialized;
        unlockTime = liquidityUnlockTime;
    }

    /**
     * @dev 获取流动性历史记录数量
     */
    function getLiquidityHistoryLength() external view returns (uint256) {
        return liquidityHistory.length;
    }

    // ============ 紧急功能 ============
    
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
            payable(to).transfer(amount);
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
        
        emit EmergencyWithdraw(token, to, amount);
    }

    // 接收 ETH
    receive() external payable {}
}