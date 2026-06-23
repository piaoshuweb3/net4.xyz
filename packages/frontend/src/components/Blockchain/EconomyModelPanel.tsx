/**
 * Economy Model 交互组件
 * 包含代币兑换、流动性添加/移除等功能
 */
'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';
import { 
  useSwap, 
  useAddLiquidity, 
  useRemoveLiquidity,
  useTokenPrice,
  useTokenLiquidity 
} from '@/hooks/useEconomyModel';

export default function EconomyModelPanel() {
  const { chainId } = useAccount();
  const [swapTokenIn, setSwapTokenIn] = useState('');
  const [swapTokenOut, setSwapTokenOut] = useState('');
  const [swapAmount, setSwapAmount] = useState('');
  const [liquidityToken, setLiquidityToken] = useState('');
  const [liquidityAmount, setLiquidityAmount] = useState('');
  const [removeLiquidityToken, setRemoveLiquidityToken] = useState('');
  const [removeLiquidityAmount, setRemoveLiquidityAmount] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // 查询代币价格
  const { data: tokenPrice } = useTokenPrice(
    swapTokenIn ? swapTokenIn as `0x${string}` : undefined,
    chainId
  );

  // 查询代币流动性
  const { data: tokenLiquidity } = useTokenLiquidity(
    liquidityToken ? liquidityToken as `0x${string}` : undefined,
    chainId
  );

  // 代币兑换
  const { swap, isPending: isSwapPending, isConfirmed: isSwapConfirmed } = useSwap(chainId);

  const handleSwap = () => {
    const errors: Record<string, string> = {};
    if (!swapTokenIn) errors.swapTokenIn = '请输入输入代币地址';
    else if (!isAddress(swapTokenIn)) errors.swapTokenIn = '无效的以太坊地址格式';
    if (!swapTokenOut) errors.swapTokenOut = '请输入输出代币地址';
    else if (!isAddress(swapTokenOut)) errors.swapTokenOut = '无效的以太坊地址格式';
    if (!swapAmount) errors.swapAmount = '请输入兑换金额';
    else if (isNaN(Number(swapAmount)) || Number(swapAmount) <= 0) errors.swapAmount = '请输入有效的金额';
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;
    swap(
      swapTokenIn as `0x${string}`,
      swapTokenOut as `0x${string}`,
      swapAmount
    );
  };

  // 添加流动性
  const { addLiquidity, isPending: isAddLiquidityPending, isConfirmed: isAddLiquidityConfirmed } = useAddLiquidity(chainId);

  const handleAddLiquidity = () => {
    const errors: Record<string, string> = {};
    if (!liquidityToken) errors.liquidityToken = '请输入代币地址';
    else if (!isAddress(liquidityToken)) errors.liquidityToken = '无效的以太坊地址格式';
    if (!liquidityAmount) errors.liquidityAmount = '请输入流动性金额';
    else if (isNaN(Number(liquidityAmount)) || Number(liquidityAmount) <= 0) errors.liquidityAmount = '请输入有效的金额';
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;
    addLiquidity(liquidityToken as `0x${string}`, liquidityAmount);
  };

  // 移除流动性
  const { removeLiquidity, isPending: isRemoveLiquidityPending, isConfirmed: isRemoveLiquidityConfirmed } = useRemoveLiquidity(chainId);

  const handleRemoveLiquidity = () => {
    const errors: Record<string, string> = {};
    if (!removeLiquidityToken) errors.removeLiquidityToken = '请输入代币地址';
    else if (!isAddress(removeLiquidityToken)) errors.removeLiquidityToken = '无效的以太坊地址格式';
    if (!removeLiquidityAmount) errors.removeLiquidityAmount = '请输入流动性份额';
    else if (isNaN(Number(removeLiquidityAmount)) || Number(removeLiquidityAmount) <= 0) errors.removeLiquidityAmount = '请输入有效的份额';
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;
    removeLiquidity(removeLiquidityToken as `0x${string}`, removeLiquidityAmount);
  };

  return (
    <div className="space-y-6 p-6 bg-gray-800/50 border border-gray-700 rounded-xl">
      <h2 className="text-2xl font-bold text-white mb-4">经济模型</h2>

      {/* 代币兑换表单 */}
      <div className="bg-gray-900/50 p-4 rounded-lg space-y-4">
        <h3 className="text-lg font-semibold text-white">代币兑换 (Swap)</h3>
        <input
          type="text"
          placeholder="输入代币地址 (0x...)"
          value={swapTokenIn}
          onChange={(e) => { setSwapTokenIn(e.target.value); setValidationErrors({}); }}
          className={`w-full p-2 bg-gray-800 border rounded text-white ${validationErrors.swapTokenIn ? 'border-red-500' : 'border-gray-600'}`}
        />
        {validationErrors.swapTokenIn && (
          <p className="text-red-400 text-xs mt-1">{validationErrors.swapTokenIn}</p>
        )}
        <input
          type="text"
          placeholder="输出代币地址 (0x...)"
          value={swapTokenOut}
          onChange={(e) => { setSwapTokenOut(e.target.value); setValidationErrors({}); }}
          className={`w-full p-2 bg-gray-800 border rounded text-white ${validationErrors.swapTokenOut ? 'border-red-500' : 'border-gray-600'}`}
        />
        {validationErrors.swapTokenOut && (
          <p className="text-red-400 text-xs mt-1">{validationErrors.swapTokenOut}</p>
        )}
        <input
          type="text"
          placeholder="兑换金额"
          value={swapAmount}
          onChange={(e) => { setSwapAmount(e.target.value); setValidationErrors({}); }}
          className={`w-full p-2 bg-gray-800 border rounded text-white ${validationErrors.swapAmount ? 'border-red-500' : 'border-gray-600'}`}
        />
        {validationErrors.swapAmount && (
          <p className="text-red-400 text-xs mt-1">{validationErrors.swapAmount}</p>
        )}
        {tokenPrice && (
          <div className="text-sm text-gray-400">当前价格: {tokenPrice as string} ETH</div>
        )}
        <button
          onClick={handleSwap}
          disabled={isSwapPending}
          className="w-full p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          {isSwapPending ? '兑换中...' : '兑换'}
        </button>
        {isSwapConfirmed && (
          <div className="text-green-400 text-sm">✓ 兑换成功！</div>
        )}
      </div>

      {/* 添加流动性表单 */}
      <div className="bg-gray-900/50 p-4 rounded-lg space-y-4">
        <h3 className="text-lg font-semibold text-white">添加流动性</h3>
        <input
          type="text"
          placeholder="代币地址 (0x...)"
          value={liquidityToken}
          onChange={(e) => { setLiquidityToken(e.target.value); setValidationErrors({}); }}
          className={`w-full p-2 bg-gray-800 border rounded text-white ${validationErrors.liquidityToken ? 'border-red-500' : 'border-gray-600'}`}
        />
        {validationErrors.liquidityToken && (
          <p className="text-red-400 text-xs mt-1">{validationErrors.liquidityToken}</p>
        )}
        <input
          type="text"
          placeholder="流动性金额"
          value={liquidityAmount}
          onChange={(e) => { setLiquidityAmount(e.target.value); setValidationErrors({}); }}
          className={`w-full p-2 bg-gray-800 border rounded text-white ${validationErrors.liquidityAmount ? 'border-red-500' : 'border-gray-600'}`}
        />
        {validationErrors.liquidityAmount && (
          <p className="text-red-400 text-xs mt-1">{validationErrors.liquidityAmount}</p>
        )}
        {tokenLiquidity && (
          <div className="text-sm text-gray-400">当前流动性: {tokenLiquidity as string} ETH</div>
        )}
        <button
          onClick={handleAddLiquidity}
          disabled={isAddLiquidityPending}
          className="w-full p-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          {isAddLiquidityPending ? '添加中...' : '添加流动性'}
        </button>
        {isAddLiquidityConfirmed && (
          <div className="text-green-400 text-sm">✓ 流动性添加成功！</div>
        )}
      </div>

      {/* 移除流动性表单 */}
      <div className="bg-gray-900/50 p-4 rounded-lg space-y-4">
        <h3 className="text-lg font-semibold text-white">移除流动性</h3>
        <input
          type="text"
          placeholder="代币地址 (0x...)"
          value={removeLiquidityToken}
          onChange={(e) => { setRemoveLiquidityToken(e.target.value); setValidationErrors({}); }}
          className={`w-full p-2 bg-gray-800 border rounded text-white ${validationErrors.removeLiquidityToken ? 'border-red-500' : 'border-gray-600'}`}
        />
        {validationErrors.removeLiquidityToken && (
          <p className="text-red-400 text-xs mt-1">{validationErrors.removeLiquidityToken}</p>
        )}
        <input
          type="text"
          placeholder="流动性份额"
          value={removeLiquidityAmount}
          onChange={(e) => { setRemoveLiquidityAmount(e.target.value); setValidationErrors({}); }}
          className={`w-full p-2 bg-gray-800 border rounded text-white ${validationErrors.removeLiquidityAmount ? 'border-red-500' : 'border-gray-600'}`}
        />
        {validationErrors.removeLiquidityAmount && (
          <p className="text-red-400 text-xs mt-1">{validationErrors.removeLiquidityAmount}</p>
        )}
        <button
          onClick={handleRemoveLiquidity}
          disabled={isRemoveLiquidityPending}
          className="w-full p-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          {isRemoveLiquidityPending ? '移除中...' : '移除流动性'}
        </button>
        {isRemoveLiquidityConfirmed && (
          <div className="text-green-400 text-sm">✓ 流动性移除成功！</div>
        )}
      </div>
    </div>
  );
}
