'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { columnArticles } from '@/components/Column/ColumnDetailPage';

interface ColumnSectionProps {
  onSelectMedia: () => void;
  onSelectArticle: (key: string) => void;
}

export default function ColumnSection({ onSelectMedia, onSelectArticle }: ColumnSectionProps) {
  const { t } = useTranslation();
  const [podcastCount, setPodcastCount] = useState(0);
  const [videoCount, setVideoCount] = useState(0);

  useEffect(() => {
    // 动态加载媒体数据，避免打包到首屏
    import('@/components/Media/MediaPage').then((mod) => {
      setPodcastCount(mod.podcastEpisodes.length);
      setVideoCount(mod.videoItems.length);
    }).catch(() => {
      // 静默失败，使用默认值 0
    });
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('sections.column.title')}</h1>
      <p className="text-lg text-gray-300 mb-8">{t('sections.column.subtitle')}</p>

      {/* 媒体中心入口 */}
      <button
        onClick={onSelectMedia}
        className="w-full flex items-center gap-5 p-5 rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 transition-all group text-left"
      >
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0 text-2xl">
          🎙️
        </div>
        <div className="flex-1">
          <div className="text-white font-bold text-lg group-hover:text-purple-300 transition-colors">
            {t('sections.column.mediaCenter')}
          </div>
          <div className="text-gray-400 text-sm mt-1">
            {podcastCount} {t('sections.column.mediaSub', { videos: videoCount })}
          </div>
        </div>
        <span className="text-purple-400 text-xl group-hover:translate-x-1 transition-transform">→</span>
      </button>

      {/* 文章列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {columnArticles.map((a) => {
          const articleData = t(`sections.column.articles.${a.key}`, { returnObjects: true }) as {
            title: string;
            subtitle: string;
            desc: string;
            readTime: string;
          };
          return (
            <button
              key={a.key}
              onClick={() => onSelectArticle(a.key)}
              className="glass-cyber rounded-lg p-6 text-left hover:bg-white/10 transition-all group"
            >
              <div className="text-3xl mb-3">{a.icon}</div>
              <h3 className="text-xl font-bold text-pink-400 mb-2 group-hover:text-pink-300 transition-colors">{articleData.title}</h3>
              <p className="text-base text-gray-400 leading-relaxed mb-3">{articleData.desc}</p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>⏱ {articleData.readTime}</span>
                {a.htmlFile && <span className="text-pink-500">📄 {t('sections.column.fullDoc')}</span>}
              </div>
              <div className="mt-3 text-sm text-pink-500 group-hover:text-pink-300 transition-colors">{t('sections.column.readMore')}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
