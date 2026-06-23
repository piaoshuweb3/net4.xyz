/**
 * Spark NFT 交互组件
 * 包含 NFT 铸造、查询余额、查看 Token URI 等功能
 */
'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';
import { 
  useSparkNFTBalance, 
  useSparkNFTMint, 
  useSparkNFTTokenURI,
  useSparkNFTOwner 
} from '@/hooks/useSparkNFT';

export default function SparkNFTPanel() {
  const { address, chainId } = useAccount();
  const [mintTo, setMintTo] = useState('');
  const [tokenURI, setTokenURI] = useState('');
  const [viewTokenId, setViewTokenId] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // 查询 NFT 余额
  const { data: balance } = useSparkNFTBalance(address, chainId);

  // 铸造 NFT
  const { mint, isPending: isMintPending, isConfirmed: isMintConfirmed } = useSparkNFTMint(chainId);

  const handleMint = () => {
    const errors: Record<string, string> = {};
    if (!mintTo) errors.mintTo = '请输入接收地址';
    else if (!isAddress(mintTo)) errors.mintTo = '无效的以太坊地址格式';
    if (!tokenURI) errors.tokenURI = '请输入 Token URI';
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;
    mint(mintTo as `0x${string}`, tokenURI);
  };

  // 查询 Token URI
  const { data: tokenURIResult } = useSparkNFTTokenURI(
    viewTokenId ? BigInt(viewTokenId) : undefined,
    chainId
  );

  // 查询 NFT 所有者
  const { data: ownerResult } = useSparkNFTOwner(
    viewTokenId ? BigInt(viewTokenId) : undefined,
    chainId
  );

  return (
    <div className="space-y-6 p-6 bg-gray-800/50 border border-gray-700 rounded-xl">
      <h2 className="text-2xl font-bold text-white mb-4">Spark NFT</h2>

      {/* 余额显示 */}
      <div className="bg-gray-900/50 p-4 rounded-lg mb-6">
        <div className="text-sm text-gray-400">你的 NFT 余额</div>
        <div className="text-xl font-bold text-white">{(balance as number) ?? 0} NFTs</div>
      </div>

      {/* 铸造 NFT 表单 */}
      <div className="bg-gray-900/50 p-4 rounded-lg space-y-4">
        <h3 className="text-lg font-semibold text-white">铸造 NFT</h3>
        <input
          type="text"
          placeholder="接收地址 (0x...)"
          value={mintTo}
          onChange={(e) => { setMintTo(e.target.value); setValidationErrors({}); }}
          className={`w-full p-2 bg-gray-800 border rounded text-white ${validationErrors.mintTo ? 'border-red-500' : 'border-gray-600'}`}
        />
        {validationErrors.mintTo && (
          <p className="text-red-400 text-xs mt-1">{validationErrors.mintTo}</p>
        )}
        <input
          type="text"
          placeholder="Token URI (ipfs://...)"
          value={tokenURI}
          onChange={(e) => { setTokenURI(e.target.value); setValidationErrors({}); }}
          className={`w-full p-2 bg-gray-800 border rounded text-white ${validationErrors.tokenURI ? 'border-red-500' : 'border-gray-600'}`}
        />
        {validationErrors.tokenURI && (
          <p className="text-red-400 text-xs mt-1">{validationErrors.tokenURI}</p>
        )}
        <button
          onClick={handleMint}
          disabled={isMintPending}
          className="w-full p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          {isMintPending ? '铸造中...' : '铸造 NFT'}
        </button>
        {isMintConfirmed && (
          <div className="text-green-400 text-sm">✓ NFT 铸造成功！</div>
        )}
      </div>

      {/* 查询 NFT 信息 */}
      <div className="bg-gray-900/50 p-4 rounded-lg space-y-4">
        <h3 className="text-lg font-semibold text-white">查询 NFT 信息</h3>
        <input
          type="text"
          placeholder="Token ID"
          value={viewTokenId}
          onChange={(e) => setViewTokenId(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
        />
        
        {tokenURIResult && (
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-sm text-gray-400">Token URI:</div>
            <div className="text-white break-all">{tokenURIResult as string}</div>
          </div>
        )}
        
        {ownerResult && (
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-sm text-gray-400">所有者:</div>
            <div className="text-white font-mono">{ownerResult as string}</div>
          </div>
        )}
      </div>
    </div>
  );
}
