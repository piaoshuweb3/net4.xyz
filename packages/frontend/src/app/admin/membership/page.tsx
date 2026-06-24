'use client';

import { useState } from 'react';
import { Crown, Plus, Edit, Trash2, Check, Star, Zap } from 'lucide-react';

const mockMembers = [
  { id: 1, email: 'vip@example.com', level: 'gold', status: 'active', expiresAt: '2025-12-31', joinedAt: '2024-01-01' },
  { id: 2, email: 'premium@example.com', level: 'silver', status: 'active', expiresAt: '2025-06-30', joinedAt: '2024-01-15' },
  { id: 3, email: 'basic@example.com', level: 'bronze', status: 'active', expiresAt: '2025-03-15', joinedAt: '2024-02-01' },
  { id: 4, email: 'expired@example.com', level: 'silver', status: 'expired', expiresAt: '2024-01-01', joinedAt: '2023-06-01' },
];

const membershipTiers = [
  { 
    id: 'gold', 
    name: '黄金会员', 
    icon: Crown, 
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    price: 999,
    benefits: ['无限 AI 调用', '优先节点资格', '专属客服', 'VIP 社群']
  },
  { 
    id: 'silver', 
    name: '白银会员', 
    icon: Star, 
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    price: 499,
    benefits: ['每日 1000 次 AI 调用', '优先任务权', '社区特权']
  },
  { 
    id: 'bronze', 
    name: '青铜会员', 
    icon: Zap, 
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    price: 199,
    benefits: ['每日 100 次 AI 调用', '基础功能']
  },
];

export default function MembershipPage() {
  const [members] = useState(mockMembers);

  const getLevelBadge = (level: string) => {
    const tier = membershipTiers.find(t => t.id === level);
    if (!tier) return null;
    return (
      <span className={`flex items-center gap-1 px-2 py-1 ${tier.bgColor} ${tier.color} rounded-full text-xs`}>
        <tier.icon className="w-3 h-3" />
        {tier.name}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">会员管理</h1>
            <p className="text-gray-400">管理会员等级和权益配置</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors">
            <Plus className="w-4 h-4" />
            添加会员
          </button>
        </div>

        {/* Membership Tiers */}
        <div className="grid md:grid-cols-3 gap-6">
          {membershipTiers.map((tier) => (
            <div key={tier.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl ${tier.bgColor} flex items-center justify-center`}>
                  <tier.icon className={`w-6 h-6 ${tier.color}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
                  <p className="text-sm text-gray-400">¥{tier.price}/年</p>
                </div>
              </div>
              <ul className="space-y-2 mb-4">
                {tier.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2 text-sm text-gray-400">
                    <Check className="w-4 h-4 text-green-400" />
                    {benefit}
                  </li>
                ))}
              </ul>
              <button className="w-full py-2 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 transition-colors text-sm">
                编辑权益
              </button>
            </div>
          ))}
        </div>

        {/* Members List */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">会员列表</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">用户</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">等级</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">状态</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">到期时间</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">注册时间</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-800/50">
                  <td className="px-6 py-4 text-white">{member.email}</td>
                  <td className="px-6 py-4">{getLevelBadge(member.level)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      member.status === 'active' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {member.status === 'active' ? '正常' : '已过期'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{member.expiresAt}</td>
                  <td className="px-6 py-4 text-gray-400">{member.joinedAt}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>);
}