'use client';

import { Shield, FileCheck, Github, Globe, ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const roadmap = [
  { phase: 'Phase 1', status: 'completed', label: '已上线', items: ['net4.xyz 门户上线', 'AFC 钱包服务', 'Web4 DNS 系统', '11 个生态子域'] },
  { phase: 'Phase 2', status: 'active', label: '进行中', items: ['AI 分身控制面板', '数字劳动市场 MVP', 'PoUE 共识节点招募', 'DID 身份中心'] },
  { phase: 'Phase 3', status: 'planned', label: '规划中', items: ['AFC 公链主网上线', '跨链桥接 (Base→AFC)', '认知资产 NFT 市场', 'TDPO 定价预言机'] },
  { phase: 'Phase 4', status: 'planned', label: '愿景', items: ['全球节点网络', 'AI 分身 DAO 治理', '分布式社交协议', '认知金融衍生品'] },
];

const trustBadges = [
  { icon: Github, label: '开源代码', href: 'https://github.com/piaoshuweb3/net4.xyz', desc: '全部代码开源可审计' },
  { icon: Shield, label: '智能合约审计', href: '#', desc: '由 CertiK 提供安全审计' },
  { icon: FileCheck, label: '白皮书', href: 'https://net4.xyz/column/afc-whitepaper', desc: '完整经济模型与技术架构' },
  { icon: Globe, label: '去中心化治理', href: '#', desc: '社区驱动的协议演进' },
];

export default function TrustSection() {
  const { t } = useTranslation();
  const trustBadges = [
    { icon: Github, label: t('homepage.trustOpenSource'), href: 'https://github.com/piaoshuweb3/net4.xyz', desc: '全部代码开源可审计' },
    { icon: Shield, label: t('homepage.trustAudit'), href: '#', desc: '由 CertiK 提供安全审计' },
    { icon: FileCheck, label: t('homepage.trustWhitepaper'), href: 'https://net4.xyz/column/afc-whitepaper', desc: '完整经济模型与技术架构' },
    { icon: Globe, label: t('homepage.trustGovernance'), href: '#', desc: '社区驱动的协议演进' },
  ];
  return (
    <div className="space-y-12">
      {/* Trust Badges */}
      <div>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">{t('homepage.trustTitle')}</h2>
          <p className="text-gray-400 text-sm">{t('homepage.trustSub')}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {trustBadges.map(badge => (
            <a
              key={badge.label}
              href={badge.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 text-center hover:bg-white/[0.05] hover:border-purple-500/20 transition-all"
            >
              <badge.icon className="w-8 h-8 text-purple-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <div className="text-sm font-medium text-white">{badge.label}</div>
              <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
                {badge.desc}
                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Roadmap */}
      <div>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">{t('homepage.roadmapTitle')}</h2>
          <p className="text-gray-400 text-sm">{t('homepage.roadmapSub')}</p>
        </div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-purple-500/50 via-cyan-500/30 to-transparent hidden md:block" />

          <div className="space-y-4">
            {roadmap.map((phase, i) => (
              <div key={phase.phase} className="relative md:pl-20">
                {/* Timeline dot */}
                <div className={`hidden md:flex absolute left-[29px] top-6 w-3.5 h-3.5 rounded-full border-2 ${
                  phase.status === 'completed' ? 'bg-green-500 border-green-500' :
                  phase.status === 'active' ? 'bg-purple-500 border-purple-500 animate-pulse' :
                  'bg-gray-700 border-gray-600'
                }`} />

                <div className={`rounded-xl border p-5 transition-all ${
                  phase.status === 'active'
                    ? 'border-purple-500/30 bg-purple-500/[0.03]'
                    : 'border-white/[0.06] bg-white/[0.02]'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-bold text-white">{phase.phase}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                      phase.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      phase.status === 'active' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                      'bg-gray-800 text-gray-500 border border-gray-700'
                    }`}>
                      {phase.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {phase.items.map(item => (
                      <div key={item} className="flex items-center gap-2 text-sm">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          phase.status === 'completed' ? 'bg-green-400' :
                          phase.status === 'active' ? 'bg-purple-400' : 'bg-gray-600'
                        }`} />
                        <span className={phase.status === 'completed' ? 'text-gray-400' : 'text-gray-500'}>
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
