import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI 分身控制面板',
  description: '创建并管理你的 AI 数字分身 — 查看状态、收益、任务历史和认知资产。',
  keywords: ['AI分身', '数字分身', 'Web4', '分身管理', 'net4.xyz'],
  openGraph: {
    title: 'AI 分身控制面板 | net4.xyz',
    description: '创建并管理你的 AI 数字分身',
    images: ['https://net4.xyz/og-image.png'],
  },
};

export default function AvatarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
