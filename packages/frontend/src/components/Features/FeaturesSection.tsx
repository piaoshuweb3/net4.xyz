'use client';

import { useTranslation } from 'react-i18next';
import { columnArticles } from '@/components/Column/ColumnDetailPage';

interface FeaturesSectionProps {
  onSectionChange?: (section: string) => void;
}

interface EcosystemItem {
  domain: string;
  icon: string;
  titleKey: string;
  descKey: string;
  color: string;
  bg: string;
  border: string;
  href?: string;
}

export default function FeaturesSection({ onSectionChange }: FeaturesSectionProps) {
  const { t } = useTranslation();

  const coreFeatures = [
    {
      title: t('features.dns.title'),
      description: t('features.dns.desc'),
      icon: '🌐',
      sectionId: 'dns',
      color: 'from-cyan-500/20 to-blue-500/20',
      border: 'border-cyan-500/30',
    },
    {
      title: t('features.poue.title'),
      description: t('features.poue.desc'),
      icon: '⚡',
      sectionId: 'poue',
      color: 'from-purple-500/20 to-pink-500/20',
      border: 'border-purple-500/30',
    },
    {
      title: t('features.ai.title'),
      description: t('features.ai.desc'),
      icon: '🤖',
      sectionId: 'whitepaper',
      color: 'from-pink-500/20 to-orange-500/20',
      border: 'border-pink-500/30',
    },
  ];

  const ecosystemItems: EcosystemItem[] = [
    {
      domain: 'labor.net4.xyz',
      icon: '💼',
      titleKey: 'labor',
      descKey: 'labor',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
    },
    {
      domain: 'afc.net4.xyz',
      icon: '🔑',
      titleKey: 'afc',
      descKey: 'afc',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
    {
      domain: 'wallet.net4.xyz',
      icon: '💳',
      titleKey: 'wallet',
      descKey: 'wallet',
      href: '/wallet',
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
    },
    {
      domain: 'soul.net4.xyz',
      icon: '🪪',
      titleKey: 'soul',
      descKey: 'soul',
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
    },
    {
      domain: 'cloud.net4.xyz',
      icon: '☁️',
      titleKey: 'cloud',
      descKey: 'cloud',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      domain: 'hardware.net4.xyz',
      icon: '🔧',
      titleKey: 'hardware',
      descKey: 'hardware',
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
    },
    {
      domain: 'dex.net4.xyz',
      icon: '📈',
      titleKey: 'dex',
      descKey: 'dex',
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
    },
    {
      domain: 'bbs.net4.xyz',
      icon: '🤝',
      titleKey: 'bbs',
      descKey: 'bbs',
      color: 'text-pink-400',
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/20',
    },
    {
      domain: 'social.net4.xyz',
      icon: '📣',
      titleKey: 'social',
      descKey: 'social',
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
    },
    {
      domain: 'did.net4.xyz',
      icon: '🌐',
      titleKey: 'did',
      descKey: 'did',
      color: 'text-teal-400',
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/20',
    },
    {
      domain: 'get.net4.xyz',
      icon: '📱',
      titleKey: 'get',
      descKey: 'get',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
    },
    {
      domain: 'partner.net4.xyz',
      icon: '🤝',
      titleKey: 'partner',
      descKey: 'partner',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
  ];
  return (
    <>
      {/* ── 核心特性 ── */}
      <section className="relative w-full py-20 bg-[#0a0a0f]" aria-labelledby="features-heading">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent mb-16" />

          <h2 id="features-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-4 text-white">
            {t('features.title')}
          </h2>
          <p className="text-center text-gray-400 mb-16 max-w-2xl mx-auto">
            {t('features.subtitle')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {coreFeatures.map((feature) => (
              <article
                key={feature.title}
                className={`p-8 rounded-xl border ${feature.border} bg-gradient-to-br ${feature.color} hover:scale-[1.02] transition-all cursor-pointer group`}
                onClick={() => feature.sectionId && onSectionChange?.(feature.sectionId)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && feature.sectionId) {
                    e.preventDefault();
                    onSectionChange?.(feature.sectionId);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={t('features.viewDetails', { name: feature.title })}
              >
                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform" aria-hidden="true">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-purple-300 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-base text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 生态入口 ── */}
      <section id="ecosystem" className="relative w-full py-24 bg-[#0a0a0f]" aria-labelledby="ecosystem-heading">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent mb-16" />

          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-6">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              <span className="text-sm text-cyan-300">{t('features.ecosystem.badge')}</span>
            </div>
            <h2 id="ecosystem-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              {t('features.ecosystem.title')}
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              {t('features.ecosystem.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {ecosystemItems.map((item) => (
              <button
                key={item.domain}
                onClick={() => {
                  if (item.href) {
                    window.location.href = item.href;
                  } else {
                    onSectionChange?.(`eco-${item.domain.split('.')[0]}`);
                  }
                }}
                className={`group relative p-5 rounded-xl border ${item.border} ${item.bg} hover:scale-[1.02] hover:border-opacity-60 transition-all text-left`}
                aria-label={t('features.viewDetails', { name: t(`features.ecosystem.items.${item.titleKey}.title`) })}
              >
                {/* 域名标签 */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{item.icon}</span>
                  <span className={`text-xs font-mono ${item.color} opacity-70 group-hover:opacity-100 transition-opacity`}>
                    {item.href ? t('features.ecosystem.walletLink') : `${item.domain} →`}
                  </span>
                </div>
                {/* 标题 */}
                <h3 className={`text-base font-bold mb-2 ${item.color}`}>
                  {t(`features.ecosystem.items.${item.titleKey}.title`)}
                </h3>
                {/* 说明 */}
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 group-hover:text-gray-400 transition-colors">
                  {t(`features.ecosystem.items.${item.descKey}.desc`)}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Jason & John 专栏 ── */}
      <section id="column" className="relative w-full py-24 bg-[#0a0a0f]" aria-labelledby="column-heading">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-pink-500/50 to-transparent mb-16" />

          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500/10 border border-pink-500/20 rounded-full mb-6">
              <span className="text-sm text-pink-300">{t('features.column.badge')}</span>
            </div>
            <h2 id="column-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              {t('features.column.title')}
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              {t('features.column.subtitle')}
            </p>
          </div>

          {/* 专栏卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {columnArticles.map((article) => {
              const articleData = t(`sections.column.articles.${article.key}`, { returnObjects: true }) as {
                title: string;
                subtitle: string;
                desc: string;
                readTime: string;
              };

              return (
                <button
                  key={article.key}
                  onClick={() => onSectionChange?.(`col-${article.key}`)}
                  className="group text-left p-6 rounded-xl border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-purple-500/5 hover:from-pink-500/10 hover:to-purple-500/10 hover:border-pink-500/40 transition-all"
                >
                  <div className="text-3xl mb-4">{article.icon}</div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-pink-300 transition-colors">
                    {articleData.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">
                    {articleData.desc}
                  </p>
                  <div className="mt-4 flex items-center gap-3 text-xs text-gray-600">
                    <span>⏱ {articleData.readTime}</span>
                    {article.htmlFile && <span className="text-pink-600">{t('features.column.fullDoc')}</span>}
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>{t('features.column.readFull')}</span>
                    <span>→</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 底部 CTA */}
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onSectionChange?.('column')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-semibold hover:from-pink-500 hover:to-purple-500 transition-all"
            >
              <span>{t('features.column.viewAll')}</span>
              <span>→</span>
            </button>
            <button
              onClick={() => onSectionChange?.('media')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-500 hover:to-indigo-500 transition-all"
            >
              <span>{t('features.column.media')}</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
