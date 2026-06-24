'use client';

import { useState } from 'react';
import { Download, Users, Wallet, Server, Activity } from 'lucide-react';

const timeRanges = [
  { label: '今日', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '本年', value: 'year' },
];

const chartData = [
  { label: '周一', value: 120 },
  { label: '周二', value: 180 },
  { label: '周三', value: 150 },
  { label: '周四', value: 220 },
  { label: '周五', value: 280 },
  { label: '周六', value: 320 },
  { label: '周日', value: 290 },
];

export default function StatsPage() {
  const [timeRange, setTimeRange] = useState('week');

  const maxValue = Math.max(...chartData.map(d => d.value));

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">数据统计</h1>
            <p className="text-gray-400">Dashboard、报表导出</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-gray-800 rounded-lg p-1">
              {timeRanges.map((range) => (
                <button
                  key={range.value}
                  onClick={() => setTimeRange(range.value)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    timeRange === range.value
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors">
              <Download className="w-4 h-4" />
              导出报表
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '新增用户', value: '234', change: '+12.5%', icon: Users, color: 'text-purple-400' },
            { label: '活跃用户', value: '8,234', change: '+5.2%', icon: Activity, color: 'text-green-400' },
            { label: '交易额', value: '$125K', change: '+23.1%', icon: Wallet, color: 'text-yellow-400' },
            { label: '任务数', value: '45K', change: '+8.7%', icon: Server, color: 'text-cyan-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                <span className="text-sm text-green-400">{stat.change}</span>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6">趋势分析</h2>
          <div className="h-64 flex items-end justify-between gap-4">
            {chartData.map((data) => (
              <div key={data.label} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-gradient-to-t from-purple-600 to-pink-600 rounded-t-lg transition-all hover:from-purple-500 hover:to-pink-500"
                  style={{ height: `${(data.value / maxValue) * 100}%` }}
                />
                <div className="mt-2 text-sm text-gray-400">{data.label}</div>
                <div className="text-xs text-white">{data.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Users */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">活跃用户 TOP 10</h2>
            <div className="space-y-3">
              {[
                { rank: 1, user: 'alex@example.com', tasks: 1234 },
                { rank: 2, user: 'sarah@example.com', tasks: 856 },
                { rank: 3, user: 'michael@example.com', tasks: 732 },
                { rank: 4, user: 'john@example.com', tasks: 654 },
                { rank: 5, user: 'emma@example.com', tasks: 543 },
              ].map((item) => (
                <div key={item.rank} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      item.rank <= 3 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {item.rank}
                    </span>
                    <span className="text-white">{item.user}</span>
                  </div>
                  <span className="text-gray-400">{item.tasks} 任务</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Nodes */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">收益最高节点 TOP 10</h2>
            <div className="space-y-3">
              {[
                { rank: 1, node: '0x7a2f...3e4d', earnings: 1250 },
                { rank: 2, node: '0x8b3c...5f6a', earnings: 980 },
                { rank: 3, node: '0x9c4d...7g8b', earnings: 850 },
                { rank: 4, node: '0x1e5f...9h0c', earnings: 720 },
                { rank: 5, node: '0x2f6a...0i1d', earnings: 650 },
              ].map((item) => (
                <div key={item.rank} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      item.rank <= 3 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {item.rank}
                    </span>
                    <span className="text-white font-mono">{item.node}</span>
                  </div>
                  <span className="text-green-400">{item.earnings} AFC</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>);
}