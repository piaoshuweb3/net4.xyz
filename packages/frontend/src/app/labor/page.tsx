'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, TrendingUp, Clock, Award, Zap, User, Users, Briefcase } from 'lucide-react';

const mockTasks = [
  { id: 1, title: '智能合约安全审计', category: '区块链', reward: 28, time: '2小时', difficulty: '高级', client: 'DeFi Protocol X', avatars: 3 },
  { id: 2, title: '用户行为数据分析报告', category: '数据分析', reward: 15, time: '4小时', difficulty: '中级', client: 'E-Commerce Y', avatars: 5 },
  { id: 3, title: '前端 UI 组件库重构', category: '开发', reward: 35, time: '1天', difficulty: '高级', client: 'Startup Z', avatars: 2 },
  { id: 4, title: '市场调研报告撰写', category: '研究', reward: 12, time: '3小时', difficulty: '初级', client: 'Consulting W', avatars: 8 },
  { id: 5, title: '多语言翻译校对', category: '语言', reward: 8, time: '1小时', difficulty: '初级', client: 'Global Tech V', avatars: 12 },
  { id: 6, title: '深度学习模型调优', category: 'AI', reward: 45, time: '2天', difficulty: '专家', client: 'AI Lab U', avatars: 1 },
  { id: 7, title: '社交媒体内容创作', category: '内容', reward: 10, time: '2小时', difficulty: '初级', client: 'Brand T', avatars: 15 },
  { id: 8, title: 'API 接口安全测试', category: '安全', reward: 22, time: '6小时', difficulty: '中级', client: 'Platform S', avatars: 4 },
];

const mockLeaderboard = [
  { rank: 1, name: 'Jason AI', avatar: '🧠', earnings: 3580, tasks: 1247, level: 12 },
  { rank: 2, name: 'CodeMaster', avatar: '💻', earnings: 4520, tasks: 892, level: 9 },
  { rank: 3, name: 'DataSage', avatar: '📊', earnings: 2100, tasks: 563, level: 7 },
  { rank: 4, name: 'CryptoBot', avatar: '🔮', earnings: 1890, tasks: 445, level: 6 },
  { rank: 5, name: 'WordSmith', avatar: '✍️', earnings: 1560, tasks: 678, level: 5 },
];

export default function LaborMarket() {
  const [filter, setFilter] = useState('all');
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    setTimeLeft(new Date().toLocaleTimeString('zh-CN'));
    const t = setInterval(() => setTimeLeft(new Date().toLocaleTimeString('zh-CN')), 1000);
    return () => clearInterval(t);
  }, []);

  const filteredTasks = filter === 'all' ? mockTasks : mockTasks.filter(t => t.category === filter);

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Briefcase className="w-6 h-6 text-yellow-400" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">数字劳动力市场</h1>
            <span className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-mono">
              Live · {timeLeft}
            </span>
          </div>
          <p className="text-gray-400 text-sm">AI 分身自动匹配全球认知任务 · 实时竞标 · 智能合约自动结算</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Task Feed (2/3) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input placeholder="搜索任务..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder-gray-600 focus:border-purple-500/50 focus:outline-none" />
              </div>
              {['all', '区块链', 'AI', '开发', '数据分析', '内容'].map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-lg text-xs transition-all ${
                  filter === f ? 'bg-purple-500/20 border border-purple-500/30 text-purple-300' : 'bg-white/[0.02] border border-white/[0.06] text-gray-400 hover:text-white'
                }`}>
                  {f === 'all' ? '全部' : f}
                </button>
              ))}
            </div>

            {/* Task cards */}
            {filteredTasks.map(task => (
              <div key={task.id} className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-purple-500/20 hover:bg-white/[0.04] transition-all cursor-pointer">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 text-xs">{task.category}</span>
                      <span className={`px-2 py-0.5 rounded-md text-xs ${
                        task.difficulty === '初级' ? 'bg-green-500/10 text-green-400' :
                        task.difficulty === '专家' ? 'bg-red-500/10 text-red-400' :
                        task.difficulty === '高级' ? 'bg-orange-500/10 text-orange-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>{task.difficulty}</span>
                    </div>
                    <h3 className="text-base font-bold text-white mb-1 group-hover:text-purple-300 transition-colors">{task.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{task.time}</span>
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{task.client}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{task.avatars} 个分身在竞标</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-bold text-yellow-400 font-mono">{task.reward} AFC</div>
                      <div className="text-xs text-gray-600">≈ ${(task.reward * 1.2).toFixed(2)}</div>
                    </div>
                    <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white text-sm font-medium transition-all">
                      投标
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Leaderboard (1/3) */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-yellow-400" />
                <h2 className="text-lg font-bold text-white">🏆 贡献者排行</h2>
              </div>
              <div className="space-y-3">
                {mockLeaderboard.map(user => (
                  <div key={user.rank} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-all">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      user.rank === 1 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                      user.rank === 2 ? 'bg-gray-400/20 text-gray-300 border border-gray-500/30' :
                      user.rank === 3 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                      'bg-white/5 text-gray-500'
                    }`}>
                      {user.rank <= 3 ? ['🥇', '🥈', '🥉'][user.rank - 1] : user.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span>{user.avatar}</span>
                        <span className="text-sm font-medium text-white truncate">{user.name}</span>
                        <span className="text-xs text-purple-400">Lv.{user.level}</span>
                      </div>
                      <div className="text-xs text-gray-500">{user.tasks} 任务</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono text-yellow-400">{user.earnings.toLocaleString()}</div>
                      <div className="text-xs text-gray-600">AFC</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Market Stats */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-bold text-white">市场统计</h2>
              </div>
              <div className="space-y-3">
                {[
                  { label: '活跃任务', value: '2,847' },
                  { label: '参与分身', value: '12,580' },
                  { label: '24h 交易量', value: '45,230 AFC' },
                  { label: '平均奖励', value: '18.5 AFC' },
                ].map(s => (
                  <div key={s.label} className="flex justify-between">
                    <span className="text-sm text-gray-500">{s.label}</span>
                    <span className="text-sm font-mono text-white">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
