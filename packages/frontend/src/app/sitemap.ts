import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://net4.xyz';

  // 静态页面
  const staticRoutes = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${baseUrl}/blockchain`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${baseUrl}/wallet`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
  ];

  // 专栏文章（SEO 优先）
  const articles = [
    'ai-avatar', 'afc-whitepaper', 'human-ai-symbiosis',
    'web4-philosophy', 'web4-complete', 'poue-tech',
    'perception-internet', 'web4-roadmap',
  ];

  const articleRoutes = articles.map((slug) => ({
    url: `${baseUrl}/column/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // 生态子域页面
  const ecosystemPages = [
    'labor', 'afc', 'soul', 'cloud', 'hardware',
    'dex', 'bbs', 'social', 'did', 'get', 'partner',
  ];

  const ecoRoutes = ecosystemPages.map((key) => ({
    url: `${baseUrl}/ecosystem/${key}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.65,
  }));

  return [...staticRoutes, ...articleRoutes, ...ecoRoutes];
}
