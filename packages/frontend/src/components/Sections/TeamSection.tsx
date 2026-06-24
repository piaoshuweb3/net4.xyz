'use client';

import { useTranslation } from 'react-i18next';
import { sciFiAvatars } from '../Avatar/SciFiAvatars';

interface TeamSectionProps {
  onSelectSection?: (section: string) => void;
}

export default function TeamSection({ onSelectSection }: TeamSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-12">
      {/* 头部 */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-6">
          <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
          <span className="text-sm text-purple-300">{t('sections.team.badge')}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('sections.team.title')}</h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          {t('sections.team.subtitle')}
        </p>
      </div>

      {/* 创始人 */}
      <div>
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="w-1 h-6 bg-purple-500 rounded-full inline-block" />
          {t('sections.team.founders')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              name: 'Jason (piaoshu)',
              title: '联合创始人 & CEO',
              avatarIndex: 0,
              color: 'from-purple-600 to-pink-600',
              border: 'border-purple-500/30',
              bg: 'bg-purple-500/5',
              did: 'piaoshu.web4',
              tags: ['Web4.0 哲学', 'AI 分身理论', '生态战略'],
              bio: '《人机共生三部曲》与《Web4.0 感知共振与个体神化》作者。深度融合马克思主义哲学、系统论与区块链技术，提出"行为即契约、记忆即永生、共性即神性"三大命题，构建 Web4.0 文明理论体系。致力于让每个普通人都能拥有属于自己的 AI 分身，实现数字主权与经济自由。',
              links: [
                { label: '专栏文章', section: 'column' },
                { label: 'soul.net4.xyz', href: 'https://soul.net4.xyz' },
              ],
            },
            {
              name: 'John',
              title: '联合创始人 & CTO',
              avatarIndex: 1,
              color: 'from-cyan-600 to-blue-600',
              border: 'border-cyan-500/30',
              bg: 'bg-cyan-500/5',
              did: 'john.web4',
              tags: ['AFC 公链', 'PoUE 共识', '分布式系统'],
              bio: '区块链底层架构专家，AFC 公链与 PoUE 共识机制的核心设计者。拥有超过 10 年分布式系统开发经验，曾参与多个主流公链的底层研发。主导 AFC 公链从 0 到 1 的技术架构设计，实现了 10,000+ TPS 与 2 秒区块确认时间。相信技术是实现人类自由的最短路径。',
              links: [
                { label: 'afc.net4.xyz', href: 'https://afc.net4.xyz' },
                { label: 'GitHub', href: 'https://github.com/net4xyz' },
              ],
            },
          ].map(m => (
            <div key={m.name} className={`glass-cyber rounded-2xl p-8 border ${m.border} ${m.bg}`}>
              <div className="flex items-start gap-5 mb-5">
                <div className={`w-16 h-16 rounded-2xl overflow-hidden border-2 ${m.border} flex-shrink-0`}>
                  <img src={sciFiAvatars[m.avatarIndex % 10].dataUri(160)} alt={m.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{m.name}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{m.title}</p>
                  <p className="text-xs font-mono text-purple-400 mt-1">{m.did}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {m.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 text-xs rounded-full bg-white/5 border border-white/10 text-gray-300">{t}</span>
                ))}
              </div>
              <p className="text-sm text-gray-400 leading-relaxed mb-5">{m.bio}</p>
              <div className="flex gap-3">
                {m.links.map(l => (
                  l.href ? (
                    <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:border-white/30 transition-all">
                      {l.label} ↗
                    </a>
                  ) : (
                    <button key={l.label} onClick={() => onSelectSection?.(l.section!)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-all">
                      {l.label} →
                    </button>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 核心团队 */}
      <div>
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="w-1 h-6 bg-cyan-500 rounded-full inline-block" />
          {t('sections.team.coreTeam')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { name: 'Alex Chen', role: '首席产品官 CPO', avatarIndex: 2, tags: ['产品设计', 'UX', 'Web4 生态'], color: 'text-pink-400' },
            { name: 'David Li', role: '首席运营官 COO', avatarIndex: 3, tags: ['运营增长', '代理商体系', '全球扩张'], color: 'text-yellow-400' },
            { name: 'Sarah Wang', role: 'AI 引擎负责人', avatarIndex: 4, tags: ['LLM', 'AI 分身', '情感计算'], color: 'text-cyan-400' },
            { name: 'Mike Zhang', role: '区块链工程师', avatarIndex: 5, tags: ['Solidity', 'DeFi', 'PoUE'], color: 'text-green-400' },
            { name: 'Lisa Zhao', role: '市场总监', avatarIndex: 6, tags: ['品牌', '社区', '内容营销'], color: 'text-orange-400' },
            { name: 'Tom Wu', role: '安全架构师', avatarIndex: 7, tags: ['密码学', 'ZKP', '安全审计'], color: 'text-red-400' },
          ].map(m => (
            <div key={m.name} className="glass-cyber rounded-xl p-5 hover:bg-white/10 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10">
                  <img src={sciFiAvatars[m.avatarIndex % 10].dataUri(100)} alt={m.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{m.name}</div>
                  <div className={`text-xs ${m.color}`}>{m.role}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {m.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 text-xs rounded bg-white/5 text-gray-500">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 顾问团 */}
      <div>
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="w-1 h-6 bg-yellow-500 rounded-full inline-block" />
          {t('sections.team.advisors')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: '顾问 A', field: '区块链经济学', org: '某知名大学', avatarIndex: 8 },
            { name: '顾问 B', field: 'AI 伦理与治理', org: '国际研究机构', avatarIndex: 9 },
            { name: '顾问 C', field: '去中心化金融', org: '头部 DeFi 协议', avatarIndex: 2 },
            { name: '顾问 D', field: '全球合规', org: '律所合伙人', avatarIndex: 4 },
          ].map(a => (
            <div key={a.name} className="glass-cyber rounded-xl p-4 text-center">
              <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 mx-auto mb-3">
                <img src={sciFiAvatars[a.avatarIndex % 10].dataUri(120)} alt={a.name} className="w-full h-full object-cover" />
              </div>
              <div className="font-bold text-white text-sm mb-1">{a.name}</div>
              <div className="text-xs text-yellow-400 mb-1">{a.field}</div>
              <div className="text-xs text-gray-600">{a.org}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 加入我们 */}
      <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5 p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">{t('sections.team.joinUs')}</h2>
        <p className="text-gray-400 mb-6 max-w-xl mx-auto">
          {t('sections.team.joinDesc')}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {['全栈工程师', 'AI 研究员', '产品经理', '社区运营', '市场营销', '区块链开发'].map(r => (
            <span key={r} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm">{r}</span>
          ))}
        </div>
        <div className="mt-6 flex gap-3 justify-center">
          <a href="mailto:team@net4.xyz" className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-500 hover:to-pink-500 transition-all text-sm">
            {t('sections.team.sendResume')}
          </a>
          <a href="https://bbs.net4.xyz" target="_blank" rel="noopener noreferrer"
            className="px-6 py-3 border border-purple-500/30 text-purple-300 rounded-xl font-bold hover:bg-purple-500/10 transition-all text-sm">
            {t('sections.team.joinCommunity')}
          </a>
        </div>
      </div>
    </div>
  );
}
