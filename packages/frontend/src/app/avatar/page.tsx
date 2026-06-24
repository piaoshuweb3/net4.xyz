import type { Metadata } from 'next';
import AvatarDashboard from '../../components/Avatar/AvatarDashboard';

export const metadata: Metadata = {
  title: 'AI 分身控制面板 | net4.xyz',
  description: '创建并管理你的 AI 数字分身 — 7×24 小时自动执行认知任务，将知识转化为数字资产。',
};

export default function AvatarPage() {
  return <AvatarDashboard />;
}
