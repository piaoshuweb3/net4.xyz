'use client';

import React, { useEffect, useState } from 'react';
import {
  useWalletStatus,
  useAFCBalanceOnBase,
  useAFCSend,
  useAFCTrade,
} from '@/hooks/useWalletService';

export default function WalletPanel() {
  const { status, isLoading: statusLoading, fetchStatus } = useWalletStatus();
  const {
    balance,
    isLoading: balanceLoading,
    error: balanceError,
    fetchAFCBalance,
  } = useAFCBalanceOnBase();
  const { result: sendResult, isLoading: sendLoading, error: sendError, sendAFC } = useAFCSend();
  const {
    result: tradeResult,
    isLoading: tradeLoading,
    error: tradeError,
    tradeAFCToETH,
    tradeETHToAFC,
  } = useAFCTrade();

  const [recipient, setRecipient] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [tradeAmount, setTradeAmount] = useState('');
  const [tradeDirection, setTradeDirection] = useState<'afc-to-eth' | 'eth-to-afc'>('afc-to-eth');

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (status?.authenticated) {
      fetchAFCBalance();
    }
  }, [status, fetchAFCBalance]);

  const handleSend = async () => {
    if (!sendAmount || !recipient) {
      alert('请输入金额和接收地址');
      return;
    }
    await sendAFC(sendAmount, recipient);
  };

  const handleTrade = async () => {
    if (!tradeAmount) {
      alert('请输入交易金额');
      return;
    }

    if (tradeDirection === 'afc-to-eth') {
      await tradeAFCToETH(tradeAmount, 100); // 1% 滑点
    } else {
      await tradeETHToAFC(tradeAmount, 100);
    }
  };

  return (
    <div className="wallet-panel bg-black/40 backdrop-blur-md border border-cyan-500/30 rounded-lg p-6 space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-cyan-400">AFC 钱包</h2>
        <button
          onClick={fetchStatus}
          disabled={statusLoading}
          className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded text-cyan-400 text-sm transition-colors disabled:opacity-50"
        >
          {statusLoading ? '刷新中...' : '刷新状态'}
        </button>
      </div>

      {/* 钱包状态 */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-cyan-300">钱包状态</h3>
        <div className="bg-black/30 rounded p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">认证状态:</span>
            <span
              className={`font-semibold ${
                status?.authenticated ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {status?.authenticated ? '已认证' : '未认证'}
            </span>
          </div>
          {status?.address && (
            <div className="flex justify-between">
              <span className="text-gray-400">地址:</span>
              <span className="text-cyan-400 font-mono text-sm">
                {status.address.slice(0, 6)}...{status.address.slice(-4)}
              </span>
            </div>
          )}
          {status?.network && (
            <div className="flex justify-between">
              <span className="text-gray-400">网络:</span>
              <span className="text-cyan-400">{status.network}</span>
            </div>
          )}
        </div>
      </div>

      {/* AFC 余额 */}
      {status?.authenticated && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-cyan-300">AFC 余额</h3>
            <button
              onClick={fetchAFCBalance}
              disabled={balanceLoading}
              className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded text-cyan-400 text-xs transition-colors disabled:opacity-50"
            >
              {balanceLoading ? '查询中...' : '刷新'}
            </button>
          </div>
          <div className="bg-black/30 rounded p-4">
            {balanceLoading ? (
              <div className="text-gray-400">加载中...</div>
            ) : balanceError ? (
              <div className="text-red-400">错误: {balanceError}</div>
            ) : balance ? (
              <div className="text-3xl font-bold text-cyan-400">
                {balance.amount} {balance.asset}
              </div>
            ) : (
              <div className="text-gray-400">暂无数据</div>
            )}
          </div>
        </div>
      )}

      {/* 发送 AFC */}
      {status?.authenticated && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-cyan-300">发送 AFC</h3>
          <div className="bg-black/30 rounded p-4 space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">接收地址</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x... 或 name.eth"
                className="w-full px-3 py-2 bg-black/50 border border-cyan-500/30 rounded text-cyan-400 placeholder-gray-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">金额</label>
              <input
                type="text"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                placeholder="10.00"
                className="w-full px-3 py-2 bg-black/50 border border-cyan-500/30 rounded text-cyan-400 placeholder-gray-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={sendLoading}
              className="w-full px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendLoading ? '发送中...' : '发送 AFC'}
            </button>
            {sendError && <div className="text-red-400 text-sm">{sendError}</div>}
            {sendResult?.success && (
              <div className="text-green-400 text-sm">
                发送成功! Tx: {sendResult.tx_hash?.slice(0, 10)}...
              </div>
            )}
          </div>
        </div>
      )}

      {/* 交易 AFC/ETH */}
      {status?.authenticated && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-cyan-300">交易 AFC/ETH</h3>
          <div className="bg-black/30 rounded p-4 space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">交易方向</label>
              <select
                value={tradeDirection}
                onChange={(e) =>
                  setTradeDirection(e.target.value as 'afc-to-eth' | 'eth-to-afc')
                }
                className="w-full px-3 py-2 bg-black/50 border border-cyan-500/30 rounded text-cyan-400 focus:outline-none focus:border-cyan-500"
              >
                <option value="afc-to-eth">AFC → ETH</option>
                <option value="eth-to-afc">ETH → AFC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">金额</label>
              <input
                type="text"
                value={tradeAmount}
                onChange={(e) => setTradeAmount(e.target.value)}
                placeholder="10.00"
                className="w-full px-3 py-2 bg-black/50 border border-cyan-500/30 rounded text-cyan-400 placeholder-gray-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              onClick={handleTrade}
              disabled={tradeLoading}
              className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {tradeLoading ? '交易中...' : '执行交易'}
            </button>
            {tradeError && <div className="text-red-400 text-sm">{tradeError}</div>}
            {tradeResult?.success && (
              <div className="text-green-400 text-sm">
                交易成功! 获得 {tradeResult.to_amount} {tradeResult.to_asset}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 未认证提示 */}
      {!status?.authenticated && !statusLoading && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-4">
          <p className="text-yellow-400 text-sm">
            钱包未认证。请在 AI Engine 中使用邮箱认证钱包。
          </p>
          <p className="text-gray-400 text-xs mt-2">
            运行命令: <code className="text-cyan-400">npx awal@2.10.0 auth login your-email@example.com</code>
          </p>
        </div>
      )}
    </div>
  );
}
