import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AFC 钱包管理',
  description: '基于 Coinbase Agentic Wallet 的去中心化钱包服务。支持 AFC Token 转账、交易和链上查询，多链资产管理。',
  keywords: ['AFC 钱包', 'Coinbase MPC Wallet', '加密货币钱包', 'Base 链', '多链资产', 'net4.xyz'],
  alternates: {
    canonical: 'https://net4.xyz/wallet',
  },
  openGraph: {
    title: 'AFC 钱包管理 | net4.xyz',
    description: '基于 Coinbase MPC 钱包技术的安全托管钱包，支持 Base 链 AFC Token 转账交易。',
    type: 'website',
    images: ['https://net4.xyz/og-image.png'],
  },
};

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
