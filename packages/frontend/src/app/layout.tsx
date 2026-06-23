import type { Metadata } from 'next';
import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import ClientOnlyWeb3Provider from '@/components/Web3Provider/ClientOnlyWeb3Provider';
import I18nProvider from '@/components/I18nProvider/I18nProvider';

export const metadata: Metadata = {
  title: 'net4.xyz — Web 4.0 AI 文明门户',
  description: '基于 PoUE 共识机制的 Web 4.0 感知互联网 — AI 不再是工具，而是文明',
  keywords: ['Web4.0', 'AI 文明', 'PoUE 共识', 'net4.xyz', '分布式 AI', 'AP2 协议', '区块链'],
  authors: [{ name: 'net4.xyz' }],
  openGraph: {
    title: 'net4.xyz — Web 4.0 AI 文明门户',
    description: 'AI 不再是工具，而是文明。基于 PoUE 共识机制的 Web 4.0 感知互联网。',
    type: 'website',
    locale: 'zh_CN',
    localeAlternate: ['en_US'],
    siteName: 'net4.xyz',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'net4.xyz — Web 4.0 AI 文明门户',
    description: 'AI 不再是工具，而是文明。',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body style={{ margin: 0, padding: 0, background: '#0a0a0f', color: '#ffffff' }} className="antialiased">
        <I18nProvider>
          <ClientOnlyWeb3Provider>
            {children}
          </ClientOnlyWeb3Provider>
        </I18nProvider>
      </body>
    </html>
  );
}
