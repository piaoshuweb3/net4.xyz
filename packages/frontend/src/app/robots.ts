import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
      {
        // 专门给 AI Agent 爬虫的规则
        userAgent: ['GPTBot', 'ChatGPT-User', 'Google-Extended', 'CCBot', 'anthropic-ai', 'Claude-Web', 'PerplexityBot', 'Applebot-Extended', 'Bytespider', 'Diffbot', 'cohere-ai'],
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: 'https://net4.xyz/sitemap.xml',
    host: 'https://net4.xyz',
  };
}
