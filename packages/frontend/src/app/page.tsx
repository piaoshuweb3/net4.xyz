import type { Metadata } from 'next';
import HomePageClient from '@/components/Home/HomePageClient';

const SITE_URL = 'https://net4.xyz';

export const metadata: Metadata = {
  title: 'net4.xyz — Web4.0 AI 文明门户',
  description: '基于 PoUE（Proof of Useful Energy）共识机制的 Web4.0 感知互联网。AI 不再是工具，而是文明。将电力转化为对人类有用的 AI 智能。',
  keywords: [
    'Web4.0', 'AI 文明', 'PoUE 共识', 'net4.xyz', '分布式 AI', 'AP2 协议',
    '区块链', '感知互联网', '数字劳动', 'DePIN', 'DID', '去中心化',
    'AFC Token', 'Crypto', 'Web3', 'AI Agent', '数字分身', 'AI分身',
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: 'net4.xyz — Web4.0 AI 文明门户',
    description: 'AI 不再是工具，而是文明。基于 PoUE 共识机制的 Web4.0 感知互联网。',
    url: SITE_URL,
    siteName: 'net4.xyz',
    type: 'website',
    locale: 'zh_CN',
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'net4.xyz — Web4.0 AI 文明门户',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'net4.xyz — Web4.0 AI 文明门户',
    description: 'AI 不再是工具，而是文明。',
    site: '@net4xyz',
    images: [`${SITE_URL}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function Home() {
  return <HomePageClient />;
}
