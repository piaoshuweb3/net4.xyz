'use client';

import { useState } from 'react';
import { X, Wallet, Mail, Github, Chrome } from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type LoginMethod = 'wallet' | 'twitter' | 'google' | 'email';

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [method, setMethod] = useState<LoginMethod | null>(null);
  const [email, setEmail] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const { isConnected, address } = useAccount();
  const { connect } = useConnect();
  // disconnect is available for future use (e.g., logout button)
  const { disconnect } = useDisconnect();

  if (!isOpen) return null;

  const handleWalletConnect = async () => {
    setIsConnecting(true);
    try {
      connect({ connector: injected() });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
    setIsConnecting(false);
  };

  const handleSocialLogin = (provider: 'twitter' | 'google') => {
    // In production, this would redirect to OAuth flow
    // For now, we'll simulate the flow
    setIsConnecting(true);
    setTimeout(() => {
      alert(`${provider === 'twitter' ? '推特' : '谷歌'}登录功能将在生产环境中启用`);
      setIsConnecting(false);
      onClose();
    }, 1000);
  };

  const handleEmailLogin = () => {
    if (!email) return;
    setIsConnecting(true);
    setTimeout(() => {
      alert(`登录链接已发送到 ${email}`);
      setIsConnecting(false);
      onClose();
    }, 1000);
  };

  const loginMethods = [
    {
      id: 'wallet' as const,
      name: '钱包连接',
      icon: Wallet,
      desc: 'MetaMask, Trust Wallet, TokenPocket',
      color: 'from-orange-500 to-yellow-500',
    },
    {
      id: 'twitter' as const,
      name: '推特登录',
      icon: Github,
      desc: '使用 Twitter 账户登录',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'google' as const,
      name: '谷歌登录',
      icon: Chrome,
      desc: '使用 Google 账户登录',
      color: 'from-red-500 to-orange-500',
    },
    {
      id: 'email' as const,
      name: '邮箱登录',
      icon: Mail,
      desc: '使用邮箱地址登录',
      color: 'from-purple-500 to-pink-500',
    },
  ];

  return (
    <div className="cyber-modal-overlay">
      {/* Backdrop */}
      <div 
        className="absolute inset-0"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="cyber-modal">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">登录 / 注册</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!method ? (
            <div className="space-y-3">
              {loginMethods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all group neon-glow-purple"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center`}>
                    <m.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-white group-hover:text-purple-300 transition-colors">
                      {m.name}
                    </div>
                    <div className="text-sm text-gray-500">{m.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : method === 'email' ? (
            <div className="space-y-4">
              <button
                onClick={() => setMethod(null)}
                className="text-sm text-gray-400 hover:text-white"
              >
                ← 返回
              </button>
              <div>
                <label className="text-sm text-gray-400 block mb-2">邮箱地址</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="cyber-input w-full"
                />
              </div>
              <button
                onClick={handleEmailLogin}
                disabled={!email || isConnecting}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 neon-glow-pink"
              >
                {isConnecting ? '发送中...' : '发送登录链接'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setMethod(null)}
                className="text-sm text-gray-400 hover:text-white"
              >
                ← 返回
              </button>
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  {method === 'wallet' ? (
                    <Wallet className="w-8 h-8 text-white" />
                  ) : method === 'twitter' ? (
                    <Github className="w-8 h-8 text-white" />
                  ) : (
                    <Chrome className="w-8 h-8 text-white" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {method === 'wallet' ? '连接钱包' : `${method === 'twitter' ? '推特' : '谷歌'}登录`}
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                  {method === 'wallet' 
                    ? '点击下方按钮连接你的钱包'
                    : `点击下方按钮使用 ${method === 'twitter' ? '推特' : '谷歌'} 账户登录`}
                </p>
                <button
                  onClick={method === 'wallet' ? handleWalletConnect : () => handleSocialLogin(method as 'twitter' | 'google')}
                  disabled={isConnecting}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 neon-glow-pink"
                >
                  {isConnecting ? '连接中...' : method === 'wallet' ? '连接钱包' : `使用 ${method === 'twitter' ? '推特' : '谷歌'} 登录`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white/5 border-t border-white/10">
          <p className="text-xs text-gray-500 text-center">
            登录即表示同意我们的
            <a href="#" className="text-purple-400 hover:underline">服务条款</a>
            和
            <a href="#" className="text-purple-400 hover:underline">隐私政策</a>
          </p>
        </div>
      </div>
    </div>
  );
}