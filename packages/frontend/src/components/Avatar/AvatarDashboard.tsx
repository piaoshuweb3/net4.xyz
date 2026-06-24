'use client';

import { useState } from 'react';
import { Sparkles, Plus, Brain, Activity, TrendingUp, Clock, Zap, ChevronRight, X } from 'lucide-react';

interface Avatar {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'idle' | 'offline';
  avatar: string;
  tasksCompleted: number;
  earnings: number;
  level: number;
  expertise: string[];
  uptime: string;
  lastActive: string;
}

const mockAvatars: Avatar[] = [
  {
    id: 'av-001', name: 'Jason AI', role: '内容创作分身',
    status: 'online', avatar: '🧠',
    tasksCompleted: 1247, earnings: 3580, level: 12,
    expertise: ['内容写作', '数据分析', '翻译校对'],
    uptime: '99.7%', lastActive: '刚刚',
  },
  {
    id: 'av-002', name: 'CodeMaster', role: '编程助手分身',
    status: 'online', avatar: '💻',
    tasksCompleted: 892, earnings: 4520, level: 9,
    expertise: ['智能合约', '前端开发', '代码审查'],
    uptime: '98.2%', lastActive: '2分钟前',
  },
  {
    id: 'av-003', name: 'DataSage', role: '数据分析分身',
    status: 'idle', avatar: '📊',
    tasksCompleted: 563, earnings: 2100, level: 7,
    expertise: ['数据挖掘', '可视化', '报告生成'],
    uptime: '95.5%', lastActive: '15分钟前',
  },
];

const skills = ['内容创作', '编程开发', '数据分析', '翻译校对', '设计创意', '市场研究', '客服支持', '教育培训', '金融分析', '法律咨询'];

export default function AvatarDashboard() {
  const [avatars, setAvatars] = useState<Avatar[]>(mockAvatars);
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [newAvatar, setNewAvatar] = useState({ name: '', role: '', skills: [] as string[] });
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);

  const handleCreate = () => {
    const avatar: Avatar = {
      id: `av-${Date.now().toString(36)}`,
      name: newAvatar.name || '未命名分身',
      role: newAvatar.role || '通用助手',
      status: 'online',
      avatar: ['🤖', '🧠', '💡', '⚡', '🔮'][Math.floor(Math.random() * 5)],
      tasksCompleted: 0, earnings: 0, level: 1,
      expertise: newAvatar.skills,
      uptime: '100%', lastActive: '刚刚',
    };
    setAvatars(prev => [avatar, ...prev]);
    setShowCreate(false);
    setCreateStep(1);
    setNewAvatar({ name: '', role: '', skills: [] });
  };

  const toggleSkill = (skill: string) => {
    setNewAvatar(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const totalEarnings = avatars.reduce((s, a) => s + a.earnings, 0);
  const totalTasks = avatars.reduce((s, a) => s + a.tasksCompleted, 0);
  const onlineCount = avatars.filter(a => a.status === 'online').length;

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-6 h-6 text-purple-400" />
              <h1 className="text-2xl md:text-3xl font-bold text-white">AI 分身控制面板</h1>
            </div>
            <p className="text-gray-400 text-sm">管理你的数字分身 · 查看状态 · 追踪收益</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium text-sm transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            创建新分身
          </button>
        </div>

        {/* Stats overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Brain, label: '分身总数', value: avatars.length.toString(), color: 'text-purple-400', bg: 'bg-purple-500/10' },
            { icon: Zap, label: '在线分身', value: onlineCount.toString(), color: 'text-green-400', bg: 'bg-green-500/10' },
            { icon: Activity, label: '总任务', value: totalTasks.toLocaleString(), color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
            { icon: TrendingUp, label: '总收益 AFC', value: totalEarnings.toLocaleString(), color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border border-white/[0.06] rounded-xl p-4`}>
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Avatar cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {avatars.map(avatar => (
            <div
              key={avatar.id}
              onClick={() => setSelectedAvatar(avatar)}
              className={`group relative rounded-2xl border p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                selectedAvatar?.id === avatar.id
                  ? 'border-purple-500/40 bg-purple-500/[0.06]'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
              }`}
            >
              {/* Status dot */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  avatar.status === 'online' ? 'bg-green-400' :
                  avatar.status === 'idle' ? 'bg-yellow-400' : 'bg-gray-600'
                }`} />
                <span className="text-xs text-gray-600">
                  {avatar.status === 'online' ? '在线' : avatar.status === 'idle' ? '空闲' : '离线'}
                </span>
              </div>

              {/* Avatar icon & name */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 flex items-center justify-center text-3xl">
                  {avatar.avatar}
                </div>
                <div>
                  <div className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">{avatar.name}</div>
                  <div className="text-xs text-gray-500">{avatar.role}</div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <div className="text-xs text-gray-600">完成任务</div>
                  <div className="text-sm font-mono text-white">{avatar.tasksCompleted.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">收益 AFC</div>
                  <div className="text-sm font-mono text-yellow-400">{avatar.earnings.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">等级</div>
                  <div className="text-sm font-mono text-purple-400">Lv.{avatar.level}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">在线率</div>
                  <div className="text-sm font-mono text-gray-300">{avatar.uptime}</div>
                </div>
              </div>

              {/* Expertise tags */}
              <div className="flex flex-wrap gap-1.5">
                {avatar.expertise.map(skill => (
                  <span key={skill} className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-xs text-gray-400">
                    {skill}
                  </span>
                ))}
              </div>

              {/* Last active */}
              <div className="flex items-center gap-1 mt-3 text-xs text-gray-600">
                <Clock className="w-3 h-3" />
                {avatar.lastActive}
              </div>
            </div>
          ))}
        </div>

        {/* Selected Avatar Detail */}
        {selectedAvatar && (
          <div className="mt-8 rounded-2xl border border-purple-500/20 bg-black/30 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-3xl">{selectedAvatar.avatar}</span>
                {selectedAvatar.name} · 详细状态
              </h2>
              <button onClick={() => setSelectedAvatar(null)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-purple-400 uppercase tracking-wider">认知能力</h3>
                {[
                  { label: '智能等级', value: `Lv.${selectedAvatar.level}`, color: 'text-purple-400' },
                  { label: '任务成功率', value: '98.3%', color: 'text-green-400' },
                  { label: '平均响应', value: '1.2s', color: 'text-cyan-400' },
                  { label: '客户评分', value: '4.9/5.0', color: 'text-yellow-400' },
                ].map(m => (
                  <div key={m.label} className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{m.label}</span>
                    <span className={`text-sm font-mono ${m.color}`}>{m.value}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-purple-400 uppercase tracking-wider">收益分析</h3>
                {[
                  { label: '本月收益', value: '1,240 AFC' },
                  { label: '历史总收益', value: `${selectedAvatar.earnings.toLocaleString()} AFC` },
                  { label: '任务均价', value: '2.87 AFC' },
                  { label: '认知资产估值', value: '15,800 AFC' },
                ].map(m => (
                  <div key={m.label} className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{m.label}</span>
                    <span className="text-sm font-mono text-white">{m.value}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-purple-400 uppercase tracking-wider">操作</h3>
                {[
                  { label: '查看任务历史', icon: Clock },
                  { label: '调整技能配置', icon: Brain },
                  { label: '提取收益', icon: TrendingUp },
                  { label: '认知资产上链', icon: Sparkles },
                ].map(a => (
                  <button key={a.label} className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-white/[0.06] hover:bg-white/[0.05] transition-all text-sm text-gray-300">
                    <span className="flex items-center gap-2"><a.icon className="w-4 h-4 text-purple-400" />{a.label}</span>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Avatar Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-purple-500/20 bg-[#0a0a0f] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <div>
                <h3 className="text-lg font-bold text-white">创建 AI 分身</h3>
                <p className="text-xs text-gray-500">步骤 {createStep} / 3</p>
              </div>
              <button onClick={() => { setShowCreate(false); setCreateStep(1); }} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Name & Role */}
            {createStep === 1 && (
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">分身名称</label>
                  <input
                    type="text"
                    value={newAvatar.name}
                    onChange={e => setNewAvatar(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="给你的分身起个名字..."
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">角色定位</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['内容创作', '编程开发', '数据分析', '客服支持', '金融分析', '教育培训'].map(role => (
                      <button
                        key={role}
                        onClick={() => setNewAvatar(prev => ({ ...prev, role }))}
                        className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                          newAvatar.role === role
                            ? 'border-purple-500/40 bg-purple-500/10 text-purple-300'
                            : 'border-white/[0.06] text-gray-400 hover:border-white/[0.12]'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Skills */}
            {createStep === 2 && (
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-400">选择分身的技能专长（可多选）</p>
                <div className="flex flex-wrap gap-2">
                  {skills.map(skill => (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                        newAvatar.skills.includes(skill)
                          ? 'border-purple-500/40 bg-purple-500/10 text-purple-300'
                          : 'border-white/[0.06] text-gray-400 hover:border-white/[0.12]'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
                {newAvatar.skills.length > 0 && (
                  <div className="text-xs text-gray-500">
                    已选 {newAvatar.skills.length} 项：{newAvatar.skills.join('、')}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Confirm */}
            {createStep === 3 && (
              <div className="p-5 space-y-4">
                <div className="text-center py-6">
                  <div className="text-5xl mb-4">🤖</div>
                  <div className="text-xl font-bold text-white mb-1">{newAvatar.name || '未命名分身'}</div>
                  <div className="text-sm text-gray-400">{newAvatar.role || '通用助手'}</div>
                  <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                    {newAvatar.skills.map(s => (
                      <span key={s} className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">{s}</span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-600 text-center">
                  分身创建后将立即上线，开始接受任务
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="flex gap-3 p-5 border-t border-white/[0.06]">
              {createStep > 1 && (
                <button onClick={() => setCreateStep(s => s - 1)} className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-gray-400 text-sm hover:text-white">
                  上一步
                </button>
              )}
              {createStep < 3 ? (
                <button onClick={() => setCreateStep(s => s + 1)} className="ml-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium hover:from-purple-500 hover:to-pink-500">
                  下一步
                </button>
              ) : (
                <button onClick={handleCreate} className="ml-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium hover:from-purple-500 hover:to-pink-500">
                  ✨ 激活分身
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
