import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import ClientOnlyWeb3Provider from '@/components/Web3Provider/ClientOnlyWeb3Provider';
import I18nProvider from '@/components/I18nProvider/I18nProvider';
import StructuredData from '@/components/SEO/StructuredData';

const SITE_URL = 'https://net4.xyz';
const SITE_NAME = 'net4.xyz — Web4.0 AI 文明门户';
const SITE_DESC = '基于 PoUE（Proof of Useful Energy）共识机制的 Web4.0 感知互联网。AI 不再是工具，而是文明。将电力转化为对人类有用的 AI 智能。';
const OG_IMAGE = `${SITE_URL}/og-image.png`;

export const viewport: Viewport = {
  themeColor: '#b026ff',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: '%s | net4.xyz',
  },
  description: SITE_DESC,
  keywords: [
    'Web4.0', 'AI 文明', 'PoUE 共识', 'net4.xyz', '分布式 AI', 'AP2 协议',
    '区块链', '感知互联网', '数字劳动', 'DePIN', 'DID', '去中心化',
    'AFC Token', 'Crypto', 'Web3', 'AI Agent', '数字分身',
  ],
  authors: [{ name: 'net4.xyz Foundation', url: SITE_URL }],
  creator: 'net4.xyz Foundation',
  publisher: 'net4.xyz Foundation',
  generator: 'net4.xyz',
  applicationName: 'net4.xyz Portal',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  // Open Graph — 社交分享 & AI Agent 内容提取
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESC,
    url: SITE_URL,
    siteName: 'net4.xyz',
    type: 'website',
    locale: 'zh_CN',
    alternateLocale: ['en_US'],
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'net4.xyz — Web4.0 AI 文明门户',
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESC,
    site: '@net4xyz',
    creator: '@net4xyz',
    images: [OG_IMAGE],
  },

  // 搜索引擎指令
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // 验证
  verification: {
    // 留空 — 部署后填入实际值
    // google: 'your-google-site-verification',
  },

  // 其他元数据
  alternates: {
    canonical: SITE_URL,
    languages: {
      'zh-CN': SITE_URL,
      'en-US': `${SITE_URL}/en`,
    },
  },

  // 图标
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icons/icon-192x192.png',
  },

  category: 'technology',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body style={{ margin: 0, padding: 0, background: '#0a0a0f', color: '#ffffff' }} className="antialiased">
        <StructuredData />
        <I18nProvider>
          <ClientOnlyWeb3Provider>
            {children}
          </ClientOnlyWeb3Provider>
        </I18nProvider>
      </body>
    </html>
  );
}
