/**
 * AFC Token Hooks
 * 实现代币余额查询、转账、授权等交互
 */
'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { AFC_TOKEN_ABI, getContractAddress } from '../config/contracts';

// 获取代币余额
export function useAFCBalance(address?: `0x${string}`, chainId?: number) {
  const contractAddress = getContractAddress('AFC_TOKEN', chainId);

  return useReadContract({
    address: contractAddress,
    abi: AFC_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      select: (data) => formatEther(data as bigint),
    },
  });
}

// 获取代币信息
export function useAFCTokenInfo(chainId?: number) {
  const contractAddress = getContractAddress('AFC_TOKEN', chainId);

  const { data: name } = useReadContract({
    address: contractAddress,
    abi: AFC_TOKEN_ABI,
    functionName: 'name',
  });

  const { data: symbol } = useReadContract({
    address: contractAddress,
    abi: AFC_TOKEN_ABI,
    functionName: 'symbol',
  });

  const { data: decimals } = useReadContract({
    address: contractAddress,
    abi: AFC_TOKEN_ABI,
    functionName: 'decimals',
  });

  const { data: totalSupply } = useReadContract({
    address: contractAddress,
    abi: AFC_TOKEN_ABI,
    functionName: 'totalSupply',
    query: {
      select: (data) => formatEther(data as bigint),
    },
  });

  return {
    name: name as string,
    symbol: symbol as string,
    decimals: decimals as number,
    totalSupply: totalSupply as string,
  };
}

// 代币转账
export function useAFCTransfer(chainId?: number) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const transfer = (to: `0x${string}`, amount: string) => {
    const contractAddress = getContractAddress('AFC_TOKEN', chainId);
    const value = parseEther(amount);

    writeContract({
      address: contractAddress,
      abi: AFC_TOKEN_ABI,
      functionName: 'transfer',
      args: [to, value],
    });
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    transfer,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}

// 代币授权
export function useAFCApprove(chainId?: number) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const approve = (spender: `0x${string}`, amount: string) => {
    const contractAddress = getContractAddress('AFC_TOKEN', chainId);
    const value = parseEther(amount);

    writeContract({
      address: contractAddress,
      abi: AFC_TOKEN_ABI,
      functionName: 'approve',
      args: [spender, value],
    });
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}

// 查询授权额度
export function useAFCAllowance(
  owner?: `0x${string}`,
  spender?: `0x${string}`,
  chainId?: number
) {
  const contractAddress = getContractAddress('AFC_TOKEN', chainId);

  return useReadContract({
    address: contractAddress,
    abi: AFC_TOKEN_ABI,
    functionName: 'allowance',
    args: owner && spender ? [owner, spender] : undefined,
    query: {
      enabled: !!owner && !!spender,
      select: (data) => formatEther(data as bigint),
    },
  });
}

// 代币锁定
export function useAFCLock(chainId?: number) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const lock = (amount: string, unlockTime: number) => {
    const contractAddress = getContractAddress('AFC_TOKEN', chainId);
    const value = parseEther(amount);

    writeContract({
      address: contractAddress,
      abi: AFC_TOKEN_ABI,
      functionName: 'lock',
      args: [value, BigInt(unlockTime)],
    });
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    lock,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}

// 查询锁定余额
export function useAFCLockedBalance(address?: `0x${string}`, chainId?: number) {
  const contractAddress = getContractAddress('AFC_TOKEN', chainId);

  return useReadContract({
    address: contractAddress,
    abi: AFC_TOKEN_ABI,
    functionName: 'lockedBalanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      select: (data) => formatEther(data as bigint),
    },
  });
}

// 释放锁定的代币
export function useAFCRelease(chainId?: number) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const release = () => {
    const contractAddress = getContractAddress('AFC_TOKEN', chainId);

    writeContract({
      address: contractAddress,
      abi: AFC_TOKEN_ABI,
      functionName: 'release',
      args: [],
    });
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    release,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}
