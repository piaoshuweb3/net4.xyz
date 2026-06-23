'use client';

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation/Navigation';
import HeroSection from '@/components/Hero/HeroSection';
import FeaturesSection from '@/components/Features/FeaturesSection';
import Footer from '@/components/Footer/Footer';
import { ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import apiService from '@/services/api';

// 动态导入详情页组件（代码分割）
const EcoDetailPage = lazy(() => import('@/components/Ecosystem/EcoDetailPage'));
const ColumnDetailPage = lazy(() => import('@/components/Column/ColumnDetailPage'));
const MediaPage = lazy(() => import('@/components/Media/MediaPage'));
const SectionRenderer = lazy(() => import('@/components/Sections/SectionRenderer'));

export default function Home() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageData, setPageData] = useState<Record<string, unknown>>({});
  const [searchDomain, setSearchDomain] = useState('');

  const loadSectionData = useCallback(async (section: string) => {
    setLoading(true);
    setError(null);
    try {
      let data: unknown = null;
      switch (section) {
        case 'whitepaper':
          try { data = await apiService.getWhitepaper(); }
          catch { data = { sections: [{ title: 'AI 分身宣言', content: 'net4.xyz 提出了 AI 分身宣言...' }, { title: 'Web4.0 感知互联网', content: 'Web4.0 是下一代互联网架构...' }] }; }
          break;
        case 'poue':
          try { data = await apiService.getPoUENodes(); }
          catch { data = { coreNodes: 21, subNodes: 128, normalNodes: '10K+' }; }
          break;
        case 'nodes':
          try { data = await apiService.getPoUENodes(); }
          catch { data = { totalNodes: 1049, activeNodes: 987 }; }
          break;
        case 'dns':   data = { message: 'DNS 系统已就绪' }; break;
        case 'ecosystem': data = { message: '生态入口' }; break;
        case 'column':    data = { message: 'Jason & John 专栏' }; break;
        case 'media':     data = {}; break;
        case 'team':      data = {}; break;
        default:
          data = {};
      }
      setPageData(prev => ({ ...prev, [section]: data }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('sections.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (activeSection && !pageData[activeSection] && !activeSection.startsWith('eco-') && !activeSection.startsWith('col-') && activeSection !== 'media') {
      loadSectionData(activeSection);
    }
  }, [activeSection, loadSectionData, pageData]);

  const handleAIQuery = async (prompt: string) => {
    setLoading(true);
    try {
      const response = await apiService.queryAI({ prompt });
      if (response.success) alert('AI: ' + response.result);
      else alert('AI Error: ' + response.error);
    } catch (err: unknown) {
      alert('Error: ' + (err instanceof Error ? err.message : String(err)));
    } finally { setLoading(false); }
  };

  const handleDomainSearch = async () => {
    if (!searchDomain) return;
    setLoading(true);
    try {
      const result = await apiService.searchDomain(searchDomain);
      alert(result.available ? `域名 ${searchDomain} 可用！` : `域名 ${searchDomain} 已被注册`);
    } catch (err: unknown) {
      alert('搜索失败: ' + (err instanceof Error ? err.message : String(err)));
    } finally { setLoading(false); }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0a0a0f] text-white">
      <Navigation onSectionChange={setActiveSection} />

      {!activeSection ? (
        <>
          <HeroSection />
          <FeaturesSection onSectionChange={setActiveSection} />
          <Footer onSectionChange={setActiveSection} />
        </>
      ) : (
        <section className="relative min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#1a1a2e] pt-32 pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setActiveSection(null)}
              className="flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-8 transition-colors"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              {t('sections.backHome')}
            </button>

            {loading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                <span className="ml-2 text-gray-400">{t('sections.loading')}</span>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-2 mb-8">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-400">{error}</span>
              </div>
            )}

            {!loading && !error && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-12">
                <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>}>
                  {/* Ecosystem 子域详情页 */}
                  {activeSection?.startsWith('eco-') && (() => {
                    const key = activeSection.replace('eco-', '');
                    return (
                      <EcoDetailPage
                        pageKey={key}
                        onBack={() => setActiveSection('ecosystem')}
                      />
                    );
                  })()}

                  {/* 专栏文章详情页 */}
                  {activeSection?.startsWith('col-') && (() => {
                    const key = activeSection.replace('col-', '');
                    return (
                      <ColumnDetailPage
                        articleKey={key}
                        onBack={() => setActiveSection('column')}
                      />
                    );
                  })()}

                  {/* 媒体中心 */}
                  {activeSection === 'media' && (
                    <MediaPage onBack={() => setActiveSection('column')} />
                  )}

                  {/* 通用 Section 渲染器 */}
                  {!activeSection.startsWith('eco-') && !activeSection.startsWith('col-') && activeSection !== 'media' && (
                    <SectionRenderer
                      activeSection={activeSection}
                      pageData={pageData}
                      searchDomain={searchDomain}
                      onSearchDomainChange={setSearchDomain}
                      onDomainSearch={handleDomainSearch}
                      onAIQuery={handleAIQuery}
                      onSelectEco={(key) => setActiveSection(`eco-${key}`)}
                      onSelectArticle={(key) => setActiveSection(`col-${key}`)}
                      onSelectMedia={() => setActiveSection('media')}
                      onSelectSection={setActiveSection}
                      loading={loading}
                    />
                  )}
                </Suspense>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
