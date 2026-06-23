'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useConnectModal, useAccountModal } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect, useSignMessage } from 'wagmi';
import { Wallet, ChevronDown, LogOut, Copy, CheckCircle, PenLine } from 'lucide-react';

/**
 * 钱包连接按钮组件
 * - 未连接：点击弹出 RainbowKit 钱包选择弹窗
 * - 已连接：显示地址 + 下拉菜单（复制地址、签名、断开）
 * 
 * 注意：在 SSR 期间返回占位按钮，避免 indexedDB 和 WagmiProvider 错误
 */
export default function WalletConnectButton() {
  const { t } = useTranslation();
  const [isClient, setIsClient] = useState(false);

  // 所有 hooks 必须在任何条件 return 之前调用，确保每次渲染数量一致
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { signMessageAsync } = useSignMessage();

  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signResult, setSignResult] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 点击下拉菜单外部时关闭菜单
  useEffect(() => {
    if (!showDropdown || !isClient) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    // 使用 setTimeout 确保点击事件先触发
    const timer = window.setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isClient, showDropdown]);

  // SSR 期间：返回静态占位按钮（hooks 已调用，但 wagmi 在服务端无数据）
  if (!isClient) {
    return (
      <button
        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg opacity-50 cursor-not-allowed whitespace-nowrap"
        disabled
        aria-label="Connect Wallet"
      >
        <Wallet className="w-4 h-4" />
        <span className="text-sm font-medium">{t('wallet.connect')}</span>
      </button>
    );
  }

  const formatAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleCopy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * 签名交互：弹出钱包签名请求
   * 用于身份验证、登录等场景
   */
  const handleSign = async () => {
    if (!address) return;
    setSigning(true);
    setSignResult(null);
    try {
      const message = `Welcome to net4.xyz!\n\nSign this message to verify your identity.\n\nAddress: ${address}\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ message });
      setSignResult(signature.slice(0, 20) + '...');
      setTimeout(() => setSignResult(null), 4000);
    } catch (err: unknown) {
      // 用户拒绝签名或出错，静默处理
      console.warn('Sign cancelled or failed:', err);
    } finally {
      setSigning(false);
    }
  };

  // 未连接状态
  if (!isConnected || !address) {
    return (
      <button
        onClick={() => openConnectModal?.()}
        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-purple-500"
        aria-label={t('wallet.connect')}
      >
        <Wallet className="w-4 h-4" />
        <span className="text-sm font-medium">{t('wallet.connect')}</span>
      </button>
    );
  }

  // 已连接状态
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 bg-purple-500/20 border border-purple-500/40 rounded-lg hover:bg-purple-500/30 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500"
        aria-expanded={showDropdown}
        aria-haspopup="true"
      >
        {/* 链状态指示点 */}
        <span className={`w-2 h-2 rounded-full ${chain ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`} />
        <span className="text-sm text-purple-300 font-mono">{formatAddress(address)}</span>
        <ChevronDown className={`w-3 h-3 text-purple-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {/* 下拉菜单 */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-52 bg-gray-900 border border-purple-500/30 rounded-xl shadow-2xl overflow-hidden z-50">
          {/* 地址头部 */}
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs text-gray-500 mb-1">{t('wallet.connected')}</p>
            <p className="text-sm text-purple-300 font-mono truncate">{address}</p>
            {chain && (
              <p className="text-xs text-gray-500 mt-1">{chain.name}</p>
            )}
          </div>

          {/* 操作列表 */}
          <div className="py-1">
            {/* 复制地址 */}
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors text-left"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? '已复制！' : '复制地址'}
            </button>

            {/* 签名验证 */}
            <button
              onClick={handleSign}
              disabled={signing}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors text-left disabled:opacity-50"
            >
              <PenLine className="w-4 h-4" />
              {signing ? '等待签名...' : t('wallet.signMessage')}
            </button>

            {/* 签名结果 */}
            {signResult && (
              <div className="mx-3 mb-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-xs text-green-400">签名成功</p>
                <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{signResult}</p>
              </div>
            )}

            {/* 查看账户（RainbowKit 内置） */}
            <button
              onClick={() => { openAccountModal?.(); setShowDropdown(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors text-left"
            >
              <Wallet className="w-4 h-4" />
              查看账户详情
            </button>

            <div className="border-t border-white/10 my-1" />

            {/* 断开连接 */}
            <button
              onClick={() => { disconnect(); setShowDropdown(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left"
            >
              <LogOut className="w-4 h-4" />
              {t('wallet.disconnect')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
