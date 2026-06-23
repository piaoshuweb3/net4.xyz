/**
 * 区块链交互主页面
 * 整合 AFC Token、Spark NFT、Economy Model 所有功能
 */
'use client';

import { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import AFCTokenPanel from '@/components/Blockchain/AFCTokenPanel';
import SparkNFTPanel from '@/components/Blockchain/SparkNFTPanel';
import EconomyModelPanel from '@/components/Blockchain/EconomyModelPanel';

export default function BlockchainPage() {
  const [isClient, setIsClient] = useState(false);

  const { isConnected, address, chain } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // SSR 期间：返回静态占位内容，不调用任何 wagmi hooks
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <header className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold">net4.xyz - 区块链交互</h1>
            <div className="flex items-center gap-4">
              <button className="px-4 py-2 bg-purple-600/50 rounded-lg opacity-50 cursor-not-allowed" disabled>
                连接钱包
              </button>
            </div>
          </div>
        </header>
        <main className="container mx-auto p-6">
          <div className="text-center py-20">
            <h2 className="text-3xl font-bold mb-4">Web3 钱包交互</h2>
            <p className="text-gray-400 mb-8">加载中...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">net4.xyz - 区块链交互</h1>
          
          <div className="flex items-center gap-4">
            {isConnected ? (
              <>
                <div className="text-sm text-gray-400">
                  {address?.slice(0, 6)}...{address?.slice(-4)} | {chain?.name}
                </div>
                <button
                  onClick={() => disconnect()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  断开连接
                </button>
              </>
            ) : (
              <button
                onClick={() => connect({ connector: injected() })}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                连接钱包
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6">
        {!isConnected ? (
          <div className="text-center py-20">
            <h2 className="text-3xl font-bold mb-4">Web3 钱包交互</h2>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 max-w-2xl mx-auto mb-8">
              <div className="flex items-start gap-3">
                <div className="text-yellow-400 text-xl">⚠️</div>
                <div className="text-left">
                  <h3 className="text-yellow-300 font-semibold mb-2">钱包类型说明</h3>
                  <div className="text-sm text-gray-300 space-y-2">
                    <p>
                      此页面用于 <strong className="text-purple-400">Web3 钱包</strong>（如 MetaMask）的区块链交互。
                    </p>
                    <p>
                      如需使用 <strong className="text-cyan-400">AFC 钱包服务</strong>，请访问 
                      <a href="/wallet" className="text-cyan-400 hover:text-cyan-300 underline ml-1">
                        AFC 钱包页面
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-gray-400 mb-8">连接 MetaMask 或其他 Web3 钱包以开始交互</p>
            <button
              onClick={() => connect({ connector: injected() })}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-lg font-semibold transition-colors"
            >
              连接 Web3 钱包
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 欢迎信息 */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-2">欢迎来到 net4.xyz 区块链交互</h2>
              <p className="text-gray-400">
                当前连接: {address?.slice(0, 6)}...{address?.slice(-4)} | 网络: {chain?.name}
              </p>
            </div>

            {/* AFC Token 功能 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">AFC Token 交互</h2>
              <AFCTokenPanel />
            </section>

            {/* Spark NFT 功能 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Spark NFT 交互</h2>
              <SparkNFTPanel />
            </section>

            {/* Economy Model 功能 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">经济模型 (Economy Model)</h2>
              <EconomyModelPanel />
            </section>

            {/* 使用说明 */}
            <section className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">使用说明</h2>
              <div className="space-y-4 text-gray-300">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">AFC Token 功能：</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>查看余额和总供应量</li>
                    <li>转账 AFC Token 到其他地址</li>
                    <li>授权其他地址使用你的代币</li>
                    <li>锁定代币（设定解锁时间）</li>
                    <li>释放已解锁的代币</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Spark NFT 功能：</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>铸造新的 NFT（需要提供接收地址和 Token URI）</li>
                    <li>查询 NFT 的 Token URI 和所有者</li>
                    <li>查看你的 NFT 余额</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">经济模型功能：</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>代币兑换（Swap）</li>
                    <li>添加流动性</li>
                    <li>移除流动性</li>
                    <li>查询代币价格和流动性</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 p-4 mt-12">
        <div className="container mx-auto text-center text-gray-400 text-sm">
          <p>net4.xyz - Web4.0 AI 文明门户 | 基于 PoUE 共识机制的分布式基础设施</p>
          <p className="mt-2">支持网络: Ethereum Mainnet | Base | Sepolia | Base Sepolia</p>
        </div>
      </footer>
    </div>
  );
}
