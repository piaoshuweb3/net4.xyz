'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, base, sepolia, baseSepolia } from 'wagmi/chains';
import { RainbowKitProvider, darkTheme, connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
  safeWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

// WalletConnect projectId — 从环境变量读取
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 
                  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 
                  '';

// 当 projectId 为空时，只使用 injected 钱包（MetaMask），避免 WalletConnect 初始化错误
const hasProjectId = projectId && projectId.length > 0;

const connectors = hasProjectId
  ? connectorsForWallets(
      [
        {
          groupName: 'Popular',
          wallets: [safeWallet, rainbowWallet, metaMaskWallet, walletConnectWallet],
        },
      ],
      { projectId, appName: 'net4.xyz — Web4.0 AI 文明门户' }
    )
  : connectorsForWallets(
      [
        {
          groupName: 'Popular',
          wallets: [safeWallet, metaMaskWallet],
        },
      ],
      { projectId: '', appName: 'net4.xyz — Web4.0 AI 文明门户' }
    );

const config = createConfig({
  connectors,
  chains: [mainnet, base, sepolia, baseSepolia],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
});

interface Web3ProviderProps {
  children: ReactNode;
}

export default function Web3Provider({ children }: Web3ProviderProps) {
  // 全局错误捕获，帮助调试浏览器端闪退
  if (typeof window !== 'undefined') {
    try {
      // 尝试捕获初始化错误
      const origOnError = window.onerror;
      window.onerror = function(msg, url, line, col, error) {
        console.error('[Web3Provider Global Error]', msg, error?.stack || error);
        if (origOnError) return origOnError(msg, url, line, col, error);
        return false;
      };
      
      window.addEventListener('unhandledrejection', (event) => {
        console.error('[Web3Provider Unhandled Rejection]', event.reason?.stack || event.reason);
      });
    } catch (e) {
      console.error('[Web3Provider Error Setup Failed]', e);
    }
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          locale="zh-CN"
          theme={darkTheme({
            accentColor: '#8b5cf6',
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}