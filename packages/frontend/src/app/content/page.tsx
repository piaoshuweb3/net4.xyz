'use client';

import { useState, useEffect } from 'react';
import { FileText, RefreshCw, ExternalLink, Globe } from 'lucide-react';

interface ContentItem {
  id: string; title: string; type: 'article' | 'video' | 'image';
  status: string; body: string; summary: string; tags: string[];
  author: string; ipfsCid: string | null; views: number;
  createdAt: string;
}

export default function PublicContent() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/content')
      .then(r => r.json())
      .then(d => setContents((d.items || []).filter((c: ContentItem) => c.status === 'published')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen bg-[#0a0a0f] pt-24 pb-20"><div className="max-w-5xl mx-auto px-4 text-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto" /></div></div>;

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">📰 Web4.0 内容中心</h1>
          <p className="text-gray-400 text-sm">
            已发布文章 · IPFS 分布式存储
            {contents.length > 0 && <span className="ml-2 text-green-400 text-xs">· {contents.length} 篇</span>}
          </p>
        </div>

        {contents.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">暂无已发布内容</p>
            <p className="text-xs text-gray-600 mt-1">管理员在后台发布后在此展示</p>
          </div>
        ) : (
          <div className="space-y-4">
            {contents.map(item => (
              <article key={item.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-purple-500/20 hover:bg-white/[0.04] transition-all">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {item.tags?.map(t => <span key={t} className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 text-xs">{t}</span>)}
                      {item.ipfsCid && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 text-xs" title={item.ipfsCid}>
                          <Globe className="w-3 h-3" /> IPFS
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-white mt-1">{item.title}</h2>
                    {item.summary && <p className="text-sm text-gray-400 mt-1">{item.summary}</p>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
                    <span>{item.author}</span>
                    <span>{new Date(item.createdAt).toLocaleDateString('zh-CN')}</span>
                    {item.ipfsCid && (
                      <a href={`https://gateway.pinata.cloud/ipfs/${item.ipfsCid}`} target="_blank" rel="noopener" className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300">
                        查看原始 <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
                {item.body && (
                  <div className="mt-3 pt-3 border-t border-white/[0.04] text-sm text-gray-300 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                    {item.body.slice(0, 300)}{item.body.length > 300 ? '...' : ''}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
