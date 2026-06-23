'use client';

import { useTranslation } from 'react-i18next';

export interface EcoPageData {
  key: string;
  domain: string;
  icon: string;
  accentColor: string;
  borderColor: string;
  bgColor: string;
}

export const ecoPages: EcoPageData[] = [
  { key: 'labor', domain: 'labor.net4.xyz', icon: '💼', accentColor: 'text-yellow-400', borderColor: 'border-yellow-500/30', bgColor: 'bg-yellow-500/10' },
  { key: 'afc', domain: 'afc.net4.xyz', icon: '🔑', accentColor: 'text-purple-400', borderColor: 'border-purple-500/30', bgColor: 'bg-purple-500/10' },
  { key: 'soul', domain: 'soul.net4.xyz', icon: '🪪', accentColor: 'text-cyan-400', borderColor: 'border-cyan-500/30', bgColor: 'bg-cyan-500/10' },
  { key: 'cloud', domain: 'cloud.net4.xyz', icon: '☁️', accentColor: 'text-blue-400', borderColor: 'border-blue-500/30', bgColor: 'bg-blue-500/10' },
  { key: 'hardware', domain: 'hardware.net4.xyz', icon: '🔧', accentColor: 'text-orange-400', borderColor: 'border-orange-500/30', bgColor: 'bg-orange-500/10' },
  { key: 'dex', domain: 'dex.net4.xyz', icon: '📈', accentColor: 'text-green-400', borderColor: 'border-green-500/30', bgColor: 'bg-green-500/10' },
  { key: 'bbs', domain: 'bbs.net4.xyz', icon: '🤝', accentColor: 'text-pink-400', borderColor: 'border-pink-500/30', bgColor: 'bg-pink-500/10' },
  { key: 'social', domain: 'social.net4.xyz', icon: '📣', accentColor: 'text-indigo-400', borderColor: 'border-indigo-500/30', bgColor: 'bg-indigo-500/10' },
  { key: 'did', domain: 'did.net4.xyz', icon: '🌐', accentColor: 'text-teal-400', borderColor: 'border-teal-500/30', bgColor: 'bg-teal-500/10' },
  { key: 'get', domain: 'get.net4.xyz', icon: '📱', accentColor: 'text-rose-400', borderColor: 'border-rose-500/30', bgColor: 'bg-rose-500/10' },
  { key: 'partner', domain: 'partner.net4.xyz', icon: '🤝', accentColor: 'text-amber-400', borderColor: 'border-amber-500/30', bgColor: 'bg-amber-500/10' },
];

interface EcoDetailPageProps {
  pageKey: string;
  onBack: () => void;
}

export default function EcoDetailPage({ pageKey, onBack }: EcoDetailPageProps) {
  const { t } = useTranslation();
  const page = ecoPages.find(p => p.key === pageKey);
  if (!page) return null;

  // Get all data from i18n
  const pageData = t(`ecosystem.${pageKey}`, { returnObjects: true }) as {
    title: string;
    tagline: string;
    overview: string;
    features: { icon: string; title: string; desc: string }[];
    stats: { label: string; value: string }[];
    cta: string;
  };

  return (
    <div className="space-y-10">
      {/* 返回按钮 */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
      >
        ← {t('ecosystem.backToEcosystem')}
      </button>

      {/* Hero 区 */}
      <div className={`relative rounded-2xl border ${page.borderColor} ${page.bgColor} p-8 md:p-12 overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/40 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{page.icon}</span>
            <div>
              <div className={`text-xs font-mono ${page.accentColor} mb-1 opacity-70`}>{page.domain}</div>
              <h1 className={`text-3xl md:text-4xl font-bold ${page.accentColor}`}>{pageData.title}</h1>
            </div>
          </div>
          <p className="text-lg text-gray-300 mb-6 max-w-2xl">{pageData.tagline}</p>
          <p className="text-base text-gray-400 leading-relaxed max-w-3xl">{pageData.overview}</p>
        </div>
      </div>

      {/* 统计数据 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {pageData.stats.map(stat => (
          <div key={stat.label} className="glass-cyber rounded-xl p-5 text-center">
            <div className={`text-2xl md:text-3xl font-bold ${page.accentColor} mb-1`}>{stat.value}</div>
            <div className="text-xs text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* 核心功能 */}
      <div>
        <h2 className="text-xl font-bold text-white mb-6">{t('ecosystem.coreFeatures')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageData.features.map(f => (
            <div key={f.title} className="glass-cyber rounded-xl p-5 hover:bg-white/10 transition-all group">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className={`text-base font-bold mb-2 ${page.accentColor} group-hover:opacity-100`}>{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className={`rounded-2xl border ${page.borderColor} ${page.bgColor} p-8 text-center`}>
        <h3 className="text-xl font-bold text-white mb-3">{pageData.cta}</h3>
        <p className="text-gray-400 mb-6 text-sm">{t('ecosystem.visitDomain', { domain: page.domain })}</p>
        <a
          href={`https://${page.domain}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all hover:scale-105 bg-gradient-to-r ${
            page.key === 'labor'    ? 'from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500' :
            page.key === 'afc'     ? 'from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500' :
            page.key === 'soul'    ? 'from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500' :
            page.key === 'cloud'   ? 'from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500' :
            page.key === 'hardware'? 'from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500' :
            page.key === 'dex'     ? 'from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500' :
            page.key === 'bbs'     ? 'from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500' :
            page.key === 'social'  ? 'from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500' :
            page.key === 'did'     ? 'from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500' :
            page.key === 'get'     ? 'from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500' :
                                     'from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500'
          }`}
        >
          <span>{pageData.cta}</span>
          <span>↗</span>
        </a>
      </div>
    </div>
  );
}
