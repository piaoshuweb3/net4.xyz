/**
 * Economy Model Hooks
 * 实现代币兑换、流动性管理等功能
 */
'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { ECONOMY_MODEL_ABI, getContractAddress } from '../config/contracts';

// 获取代币价格
export function useTokenPrice(tokenAddress?: `0x${string}`, chainId?: number) {
  const contractAddress = getContractAddress('ECONOMY_MODEL', chainId);

  return useReadContract({
    address: contractAddress,
    abi: ECONOMY_MODEL_ABI,
    functionName: 'getPrice',
    args: tokenAddress ? [tokenAddress] : undefined,
    query: {
      enabled: !!tokenAddress,
      select: (data) => formatEther(data as bigint),
    },
  });
}

// 获取代币流动性
export function useTokenLiquidity(tokenAddress?: `0x${string}`, chainId?: number) {
  const contractAddress = getContractAddress('ECONOMY_MODEL', chainId);

  return useReadContract({
    address: contractAddress,
    abi: ECONOMY_MODEL_ABI,
    functionName: 'getLiquidity',
    args: tokenAddress ? [tokenAddress] : undefined,
    query: {
      enabled: !!tokenAddress,
      select: (data) => formatEther(data as bigint),
    },
  });
}

// 代币兑换（Swap）
export function useSwap(chainId?: number) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const swap = (
    tokenIn: `0x${string}`,
    tokenOut: `0x${string}`,
    amountIn: string
  ) => {
    const contractAddress = getContractAddress('ECONOMY_MODEL', chainId);
    const value = parseEther(amountIn);

    writeContract({
      address: contractAddress,
      abi: ECONOMY_MODEL_ABI,
      functionName: 'swap',
      args: [tokenIn, tokenOut, value],
    });
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    swap,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}

// 添加流动性
export function useAddLiquidity(chainId?: number) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const addLiquidity = (token: `0x${string}`, amount: string) => {
    const contractAddress = getContractAddress('ECONOMY_MODEL', chainId);
    const value = parseEther(amount);

    writeContract({
      address: contractAddress,
      abi: ECONOMY_MODEL_ABI,
      functionName: 'addLiquidity',
      args: [token, value],
    });
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    addLiquidity,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}

// 移除流动性
export function useRemoveLiquidity(chainId?: number) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const removeLiquidity = (token: `0x${string}`, liquidity: string) => {
    const contractAddress = getContractAddress('ECONOMY_MODEL', chainId);
    const value = parseEther(liquidity);

    writeContract({
      address: contractAddress,
      abi: ECONOMY_MODEL_ABI,
      functionName: 'removeLiquidity',
      args: [token, value],
    });
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    removeLiquidity,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}
