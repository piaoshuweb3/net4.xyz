'use client';

import { useState } from 'react';
import { Shield, Cpu, Zap, TrendingUp, Lock } from 'lucide-react';

interface NodeTier {
  name: string;
  icon: React.ElementType;
  color: string;
  count: string;
  requirements: string[];
  rewards: string[];
  borderColor: string;
}

const nodeTiers: NodeTier[] = [
  {
    name: '核心验证节点',
    icon: Shield,
    color: 'text-yellow-400',
    count: '21',
    requirements: [
      '抵押: 10万 USDT',
      '硬件: H100/A100 GPU',
      '带宽: 1Gbps+',
      '在线: 99.9%',
    ],
    rewards: [
      '年化: 8%-12%',
      '交易手续费分成',
      '治理投票权',
    ],
    borderColor: 'border-yellow-500/30',
  },
  {
    name: '子节点',
    icon: Cpu,
    color: 'text-orange-400',
    count: '128',
    requirements: [
      '抵押: 9,999 USDT',
      '硬件: RTX 4090 x 2',
      '带宽: 100Mbps+',
      '在线: 99%',
    ],
    rewards: [
      '年化: 3%-5%',
      '任务优先权',
      '社区特权',
    ],
    borderColor: 'border-orange-500/30',
  },
  {
    name: '普通节点',
    icon: Zap,
    color: 'text-green-400',
    count: '10,000+',
    requirements: [
      '抵押: 1个火种 NFT',
      '硬件: API 接入',
      '无带宽要求',
      '无在线要求',
    ],
    rewards: [
      '生态空投',
      '优先体验权',
      '社区荣誉',
    ],
    borderColor: 'border-green-500/30',
  },
];

export default function NodesSection() {
  const [activeTier, setActiveTier] = useState(0);

  return (
    <section id="nodes" className="py-24 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-yellow-900/5 to-[#0a0a0f]" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full mb-6">
            <TrendingUp className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-yellow-300">三级节点架构</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              PoUE
            </span>
            <span className="text-white"> 节点网络</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            加入 AFC 网络，成为 Web4.0 基础设施的一部分
          </p>
        </div>

        {/* Node Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {nodeTiers.map((tier, index) => (
            <div
              key={tier.name}
              onClick={() => setActiveTier(index)}
              className={`relative bg-white/5 border rounded-2xl p-6 cursor-pointer transition-all hover:-translate-y-1 ${
                activeTier === index
                  ? `${tier.borderColor} bg-white/10`
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              {/* Count Badge */}
              <div className="absolute -top-3 -right-3 w-12 h-12 bg-black/80 border border-white/10 rounded-full flex items-center justify-center">
                <span className={`text-lg font-bold ${tier.color}`}>{tier.count}</span>
              </div>

              {/* Icon */}
              <div className={`w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-4`}>
                <tier.icon className={`w-7 h-7 ${tier.color}`} />
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>

              {/* Requirements */}
              <div className="space-y-2 mb-4">
                <div className="text-sm text-gray-400 font-medium">要求</div>
                {tier.requirements.map((req) => (
                  <div key={req} className="flex items-center gap-2 text-sm text-gray-500">
                    <Lock className="w-3 h-3" />
                    {req}
                  </div>
                ))}
              </div>

              {/* Rewards */}
              <div className="space-y-2 pt-4 border-t border-white/10">
                <div className="text-sm text-gray-400 font-medium">收益</div>
                {tier.rewards.map((reward) => (
                  <div key={reward} className="flex items-center gap-2 text-sm text-gray-500">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    {reward}
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                className={`w-full mt-6 py-3 rounded-lg font-medium transition-all ${
                  activeTier === index
                    ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                申请加入
              </button>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {[
            { value: '10,149', label: '总节点数' },
            { value: '8.5 PH/s', label: '总算力' },
            { value: '99.9%', label: '网络可用性' },
            { value: '$2.5M+', label: '日均收益' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Join CTA */}
        <div className="mt-12 text-center">
          <p className="text-gray-400 mb-4">还没有火种 NFT？</p>
          <button className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-medium hover:from-yellow-500 hover:to-orange-500 transition-all">
            铸造火种 NFT
          </button>
        </div>
      </div>
    </section>
  );
}