/**
 * Spark NFT Hooks
 * 实现 NFT 铸造、查询、转移等交互
 */
'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { SPARK_NFT_ABI, getContractAddress } from '@/config/contracts';

// 获取 NFT 信息
export function useSparkNFTInfo(chainId?: number) {
  const contractAddress = getContractAddress('SPARK_NFT', chainId);

  const { data: name } = useReadContract({
    address: contractAddress,
    abi: SPARK_NFT_ABI,
    functionName: 'name',
  });

  const { data: symbol } = useReadContract({
    address: contractAddress,
    abi: SPARK_NFT_ABI,
    functionName: 'symbol',
  });

  return {
    name: name as string,
    symbol: symbol as string,
  };
}

// 获取用户 NFT 余额
export function useSparkNFTBalance(address?: `0x${string}`, chainId?: number) {
  const contractAddress = getContractAddress('SPARK_NFT', chainId);

  return useReadContract({
    address: contractAddress,
    abi: SPARK_NFT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      select: (data) => Number(data),
    },
  });
}

// 获取 NFT Token URI
export function useSparkNFTTokenURI(tokenId?: bigint, chainId?: number) {
  const contractAddress = getContractAddress('SPARK_NFT', chainId);

  return useReadContract({
    address: contractAddress,
    abi: SPARK_NFT_ABI,
    functionName: 'tokenURI',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });
}

// 铸造 NFT
export function useSparkNFTMint(chainId?: number) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const mint = (to: `0x${string}`, uri: string) => {
    const contractAddress = getContractAddress('SPARK_NFT', chainId);

    writeContract({
      address: contractAddress,
      abi: SPARK_NFT_ABI,
      functionName: 'mint',
      args: [to, uri],
    });
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    mint,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}

// 获取 NFT 所有者
export function useSparkNFTOwner(tokenId?: bigint, chainId?: number) {
  const contractAddress = getContractAddress('SPARK_NFT', chainId);

  return useReadContract({
    address: contractAddress,
    abi: SPARK_NFT_ABI,
    functionName: 'ownerOf',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });
}
