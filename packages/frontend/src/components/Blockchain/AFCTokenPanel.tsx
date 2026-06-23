/**
 * AFC Token 交互组件
 * 包含余额查询、转账、授权、代币锁定等功能
 */
'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { isAddress } from 'viem';
import { 
  useAFCBalance, 
  useAFCTokenInfo, 
  useAFCTransfer, 
  useAFCApprove, 
  useAFCLock,
  useAFCRelease,
  useAFCLockedBalance
} from '@/hooks/useAFCToken';
// formatEther is used via useAFCBalance/useAFCLockedBalance hooks internally

export default function AFCTokenPanel() {
  const { address, chainId } = useAccount();
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [approveSpender, setApproveSpender] = useState('');
  const [approveAmount, setApproveAmount] = useState('');
  const [lockAmount, setLockAmount] = useState('');
  const [lockDays, setLockDays] = useState('30');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // 查询余额和代币信息
  const { data: balance } = useAFCBalance(address, chainId);
  const { data: lockedBalance } = useAFCLockedBalance(address, chainId);
  const { name, symbol, totalSupply } = useAFCTokenInfo(chainId);

  // 转账功能
  const { transfer, isPending: isTransferPending, isConfirmed: isTransferConfirmed } = useAFCTransfer(chainId);

  const handleTransfer = () => {
    const errors: Record<string, string> = {};
    if (!transferTo) errors.transferTo = '请输入接收地址';
    else if (!isAddress(transferTo)) errors.transferTo = '无效的以太坊地址格式';
    if (!transferAmount) errors.transferAmount = '请输入转账金额';
    else if (isNaN(Number(transferAmount)) || Number(transferAmount) <= 0) errors.transferAmount = '请输入有效的金额';
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;
    transfer(transferTo as `0x${string}`, transferAmount);
  };

  // 授权功能
  const { approve, isPending: isApprovePending, isConfirmed: isApproveConfirmed } = useAFCApprove(chainId);

  const handleApprove = () => {
    const errors: Record<string, string> = {};
    if (!approveSpender) errors.approveSpender = '请输入授权地址';
    else if (!isAddress(approveSpender)) errors.approveSpender = '无效的以太坊地址格式';
    if (!approveAmount) errors.approveAmount = '请输入授权金额';
    else if (isNaN(Number(approveAmount)) || Number(approveAmount) <= 0) errors.approveAmount = '请输入有效的金额';
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;
    approve(approveSpender as `0x${string}`, approveAmount);
  };

  // 锁定功能
  const { lock, isPending: isLockPending, isConfirmed: isLockConfirmed } = useAFCLock(chainId);

  const handleLock = () => {
    if (!lockAmount || !lockDays) return;
    const unlockTime = Math.floor(Date.now() / 1000) + Number(lockDays) * 24 * 60 * 60;
    lock(lockAmount, unlockTime);
  };

  // 释放功能
  const { release, isPending: isReleasePending, isConfirmed: isReleaseConfirmed } = useAFCRelease(chainId);

  const handleRelease = () => {
    release();
  };

  return (
    <div className="space-y-6 p-6 bg-gray-800/50 border border-gray-700 rounded-xl">
      <h2 className="text-2xl font-bold text-white mb-4">
        {name || 'AFC Token'} ({symbol || 'AFC'})
      </h2>

      {/* 余额显示 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900/50 p-4 rounded-lg">
          <div className="text-sm text-gray-400">余额</div>
          <div className="text-xl font-bold text-white">{(balance as string) || '0'} AFC</div>
        </div>
        <div className="bg-gray-900/50 p-4 rounded-lg">
          <div className="text-sm text-gray-400">锁定余额</div>
          <div className="text-xl font-bold text-yellow-400">{(lockedBalance as string) || '0'} AFC</div>
        </div>
        <div className="bg-gray-900/50 p-4 rounded-lg">
          <div className="text-sm text-gray-400">总供应量</div>
          <div className="text-xl font-bold text-purple-400">{(totalSupply as string) || '0'} AFC</div>
        </div>
      </div>

      {/* 转账表单 */}
      <div className="bg-gray-900/50 p-4 rounded-lg space-y-4">
        <h3 className="text-lg font-semibold text-white">转账</h3>
        <input
          type="text"
          placeholder="接收地址 (0x...)"
          value={transferTo}
          onChange={(e) => { setTransferTo(e.target.value); setValidationErrors({}); }}
          className={`w-full p-2 bg-gray-800 border rounded text-white ${validationErrors.transferTo ? 'border-red-500' : 'border-gray-600'}`}
        />
        {validationErrors.transferTo && (
          <p className="text-red-400 text-xs mt-1">{validationErrors.transferTo}</p>
        )}
        <input
          type="text"
          placeholder="转账金额"
          value={transferAmount}
          onChange={(e) => { setTransferAmount(e.target.value); setValidationErrors({}); }}
          className={`w-full p-2 bg-gray-800 border rounded text-white ${validationErrors.transferAmount ? 'border-red-500' : 'border-gray-600'}`}
        />
        {validationErrors.transferAmount && (
          <p className="text-red-400 text-xs mt-1">{validationErrors.transferAmount}</p>
        )}
        <button
          onClick={handleTransfer}
          disabled={isTransferPending}
          className="w-full p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          {isTransferPending ? '处理中...' : '发送转账'}
        </button>
        {isTransferConfirmed && (
          <div className="text-green-400 text-sm">✓ 转账成功！</div>
        )}
      </div>

      {/* 授权表单 */}
      <div className="bg-gray-900/50 p-4 rounded-lg space-y-4">
        <h3 className="text-lg font-semibold text-white">授权</h3>
        <input
          type="text"
          placeholder="授权地址 (0x...)"
          value={approveSpender}
          onChange={(e) => { setApproveSpender(e.target.value); setValidationErrors({}); }}
          className={`w-full p-2 bg-gray-800 border rounded text-white ${validationErrors.approveSpender ? 'border-red-500' : 'border-gray-600'}`}
        />
        {validationErrors.approveSpender && (
          <p className="text-red-400 text-xs mt-1">{validationErrors.approveSpender}</p>
        )}
        <input
          type="text"
          placeholder="授权金额"
          value={approveAmount}
          onChange={(e) => { setApproveAmount(e.target.value); setValidationErrors({}); }}
          className={`w-full p-2 bg-gray-800 border rounded text-white ${validationErrors.approveAmount ? 'border-red-500' : 'border-gray-600'}`}
        />
        {validationErrors.approveAmount && (
          <p className="text-red-400 text-xs mt-1">{validationErrors.approveAmount}</p>
        )}
        <button
          onClick={handleApprove}
          disabled={isApprovePending}
          className="w-full p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          {isApprovePending ? '处理中...' : '授权'}
        </button>
        {isApproveConfirmed && (
          <div className="text-green-400 text-sm">✓ 授权成功！</div>
        )}
      </div>

      {/* 代币锁定表单 */}
      <div className="bg-gray-900/50 p-4 rounded-lg space-y-4">
        <h3 className="text-lg font-semibold text-white">代币锁定</h3>
        <input
          type="text"
          placeholder="锁定金额"
          value={lockAmount}
          onChange={(e) => setLockAmount(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
        />
        <input
          type="number"
          placeholder="锁定天数"
          value={lockDays}
          onChange={(e) => setLockDays(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
        />
        <button
          onClick={handleLock}
          disabled={isLockPending}
          className="w-full p-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          {isLockPending ? '处理中...' : '锁定代币'}
        </button>
        {isLockConfirmed && (
          <div className="text-green-400 text-sm">✓ 代币锁定成功！</div>
        )}
      </div>

      {/* 释放锁定代币 */}
      {lockedBalance && Number(lockedBalance) > 0 && (
        <div className="bg-gray-900/50 p-4 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold text-white">释放锁定代币</h3>
          <button
            onClick={handleRelease}
            disabled={isReleasePending}
            className="w-full p-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {isReleasePending ? '处理中...' : '释放代币'}
          </button>
          {isReleaseConfirmed && (
            <div className="text-green-400 text-sm">✓ 代币释放成功！</div>
          )}
        </div>
      )}
    </div>
  );
}
