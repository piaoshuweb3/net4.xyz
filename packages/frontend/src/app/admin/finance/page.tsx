'use client';

import { useState } from 'react';
import { Search, Download, DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import AdminLayout from '@/components/Admin/AdminLayout';

const mockTransactions = [
  { id: 1, user: 'alex@example.com', type: 'deposit', amount: 10000, currency: 'USDT', status: 'completed', time: '2024-02-15 10:30' },
  { id: 2, user: 'sarah@example.com', type: 'withdraw', amount: 5000, currency: 'USDT', status: 'pending', time: '2024-02-15 09:45' },
  { id: 3, user: 'michael@example.com', type: 'purchase', amount: 999, currency: 'AFC', status: 'completed', time: '2024-02-15 08:20' },
  { id: 4, user: 'john@example.com', type: 'reward', amount: 250, currency: 'AFC', status: 'completed', time: '2024-02-14 22:15' },
  { id: 5, user: 'emma@example.com', type: 'deposit', amount: 5000, currency: 'USDT', status: 'completed', time: '2024-02-14 18:30' },
];

const stats = [
  { label: '总收入', value: '$125,430', change: '+12.5%', icon: DollarSign, color: 'text-green-400' },
  { label: '今日收入', value: '$3,250', change: '+5.2%', icon: TrendingUp, color: 'text-green-400' },
  { label: '待审核提现', value: '$12,500', change: '-3.1%', icon: TrendingDown, color: 'text-yellow-400' },
  { label: '总订单', value: '1,234', change: '+8.7%', icon: DollarSign, color: 'text-purple-400' },
];

export default function FinancePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [transactions] = useState(mockTransactions);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowDownRight className="w-4 h-4 text-green-400" />;
      case 'withdraw': return <ArrowUpRight className="w-4 h-4 text-red-400" />;
      case 'purchase': return <DollarSign className="w-4 h-4 text-purple-400" />;
      case 'reward': return <TrendingUp className="w-4 h-4 text-yellow-400" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'deposit': return '充值';
      case 'withdraw': return '提现';
      case 'purchase': return '购买';
      case 'reward': return '奖励';
      default: return type;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">财务管理</h1>
            <p className="text-gray-400">订单查询、支付对账</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors">
            <Download className="w-4 h-4" />
            导出报表
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                <span className={`text-sm ${stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                  {stat.change}
                </span>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索用户邮箱或交易ID..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
          <select className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white">
            <option value="">全部类型</option>
            <option value="deposit">充值</option>
            <option value="withdraw">提现</option>
            <option value="purchase">购买</option>
            <option value="reward">奖励</option>
          </select>
          <select className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white">
            <option value="">全部状态</option>
            <option value="completed">已完成</option>
            <option value="pending">处理中</option>
            <option value="failed">失败</option>
          </select>
        </div>

        {/* Transactions Table */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">交易ID</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">用户</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">类型</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">金额</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">状态</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <span className="text-white font-mono">#{tx.id.toString().padStart(6, '0')}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{tx.user}</td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-2 text-gray-400">
                      {getTypeIcon(tx.type)}
                      {getTypeLabel(tx.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-medium ${tx.type === 'withdraw' ? 'text-red-400' : 'text-green-400'}`}>
                      {tx.type === 'withdraw' ? '-' : '+'}{tx.amount} {tx.currency}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      tx.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {tx.status === 'completed' ? '已完成' : tx.status === 'pending' ? '处理中' : '失败'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{tx.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            显示 1-5 条，共 5 条记录
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white">
              上一页
            </button>
            <button className="px-3 py-1 bg-purple-600 text-white rounded-lg">1</button>
            <button className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white">
              下一页
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}