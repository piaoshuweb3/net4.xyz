import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '区块链交互',
  description: 'AFC Token 管理、Spark NFT 铸造与交易、经济模型交互 — Web4.0 区块链一站式操作面板。',
  keywords: ['区块链', 'AFC Token', 'Spark NFT', '智能合约', 'DeFi', 'Web4.0', 'net4.xyz'],
  alternates: {
    canonical: 'https://net4.xyz/blockchain',
  },
  openGraph: {
    title: '区块链交互 | net4.xyz',
    description: 'AFC Token 管理、Spark NFT 铸造交易、经济模型交互 — Web4.0 区块链操作面板。',
    type: 'website',
    images: ['https://net4.xyz/og-image.png'],
  },
};

export default function BlockchainLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
