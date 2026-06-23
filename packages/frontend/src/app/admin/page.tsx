'use client';

import { Users, Server, Activity, DollarSign } from 'lucide-react';
import AdminLayout from '@/components/Admin/AdminLayout';

const stats = [
  { label: '总用户数', value: '12,345', change: '+12.5%', icon: Users, color: 'text-purple-400' },
  { label: '活跃节点', value: '8,234', change: '+5.2%', icon: Server, color: 'text-green-400' },
  { label: '交易总额', value: '$2.5M', change: '+23.1%', icon: DollarSign, color: 'text-yellow-400' },
  { label: '今日任务', value: '45,678', change: '+8.7%', icon: Activity, color: 'text-cyan-400' },
];

const recentTransactions = [
  { id: 1, user: '0x7a2f...3e4d', amount: '1,000 AFC', type: '质押', time: '2分钟前' },
  { id: 2, user: '0x8b3c...5f6a', amount: '500 AFC', type: '奖励', time: '5分钟前' },
  { id: 3, user: '0x9c4d...7g8b', amount: '2,000 AFC', type: '提现', time: '10分钟前' },
  { id: 4, user: '0x1e5f...9h0c', amount: '750 AFC', type: '质押', time: '15分钟前' },
  { id: 5, user: '0x2f6a...0i1d', amount: '1,500 AFC', type: '奖励', time: '20分钟前' },
];

const recentActivities = [
  { id: 1, action: '新用户注册', user: 'alex@example.com', time: '1分钟前' },
  { id: 2, action: '节点上线', user: '0x7a2f...3e4d', time: '5分钟前' },
  { id: 3, action: '域名注册', user: 'ai-avatar.web4', time: '10分钟前' },
  { id: 4, action: 'NFT 铸造', user: '0x8b3c...5f6a', time: '15分钟前' },
  { id: 5, action: '任务完成', user: '节点 #2341', time: '20分钟前' },
];

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">仪表盘</h1>
            <p className="text-gray-400">欢迎回来，管理员</p>
          </div>
          <div className="text-sm text-gray-500">
            最后更新: {new Date().toLocaleString('zh-CN')}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-gray-800/50 border border-gray-700 rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                <span className="text-sm text-green-400">{stat.change}</span>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Transactions */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">最近交易</h2>
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-3 border-b border-gray-700 last:border-0"
                >
                  <div>
                    <div className="text-sm text-white font-mono">{tx.user}</div>
                    <div className="text-xs text-gray-500">{tx.time}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white">{tx.amount}</div>
                    <div className="text-xs text-gray-500">{tx.type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">最近活动</h2>
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between py-3 border-b border-gray-700 last:border-0"
                >
                  <div>
                    <div className="text-sm text-white">{activity.action}</div>
                    <div className="text-xs text-gray-500">{activity.user}</div>
                  </div>
                  <div className="text-xs text-gray-500">{activity.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '发送通知', action: '发送' },
            { label: '审核内容', action: '查看' },
            { label: '导出数据', action: '导出' },
            { label: '系统配置', action: '配置' },
          ].map((action) => (
            <button
              key={action.label}
              className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl text-center hover:bg-gray-700 transition-colors"
            >
              <div className="text-sm text-white">{action.label}</div>
              <div className="text-xs text-purple-400 mt-1">{action.action} →</div>
            </button>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}