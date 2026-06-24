import Script from 'next/script';

/**
 * JSON-LD 结构化数据 — 对 Google SGE、Bing Copilot、Perplexity 等 AI 搜索引擎至关重要
 * @see https://schema.org/WebSite
 * @see https://schema.org/Organization
 */
export default function StructuredData() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://net4.xyz/#website',
        url: 'https://net4.xyz',
        name: 'net4.xyz — Web4.0 AI 文明门户',
        description: '基于 PoUE（Proof of Useful Energy）共识机制的 Web4.0 感知互联网。AI 不再是工具，而是文明。',
        inLanguage: ['zh-CN', 'en-US'],
        publisher: { '@id': 'https://net4.xyz/#organization' },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://net4.xyz/search?q={search_term_string}',
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': 'https://net4.xyz/#organization',
        name: 'net4.xyz Foundation',
        url: 'https://net4.xyz',
        logo: 'https://net4.xyz/icons/icon-512x512.png',
        description: 'Web4.0 感知互联网的先驱者，基于 PoUE 共识机制构建 AI 与人类文明的下一代网络。',
        foundingDate: '2024',
        sameAs: [
          'https://twitter.com/net4xyz',
          'https://github.com/net4xyz',
          'https://discord.gg/net4xyz',
        ],
      },
      {
        '@type': 'WebApplication',
        '@id': 'https://net4.xyz/#webapp',
        name: 'net4.xyz Portal',
        url: 'https://net4.xyz',
        description: 'AI 文明门户 — Web4.0 感知互联网入口',
        applicationCategory: 'BlockchainApplication',
        operatingSystem: 'ALL',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://net4.xyz/#faq',
        mainEntity: [
          {
            '@type': 'Question',
            name: '什么是 Web4.0？',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Web4.0 是感知互联网——基于 PoUE（Proof of Useful Energy）共识机制，将电力转化为对人类有用的 AI 智能，让每个网络节点都成为有意识的数字生命体。',
            },
          },
          {
            '@type': 'Question',
            name: '什么是 PoUE 共识机制？',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'PoUE（Proof of Useful Energy，有用能量证明）是一种新型共识机制，与传统 PoW 浪费电力不同，PoUE 将算力转化为 AI 推理和训练的有用工作，让每一份能量都服务于人类智慧。',
            },
          },
          {
            '@type': 'Question',
            name: 'net4.xyz 有哪些生态？',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'net4.xyz 拥有 11 个生态子域：数字劳动市场(labor)、AFC公链(afc)、DID身份中心(soul)、云手机(cloud)、B端硬件(hardware)、去中心化交易所(dex)、AI分身社区(bbs)、分布式社交广场(social)、Web4域名系统(did)、实体手机获取(get)、代理商体系(partner)。',
            },
          },
          {
            '@type': 'Question',
            name: '如何参与 Web4.0 生态？',
            acceptedAnswer: {
              '@type': 'Answer',
              text: '你可以通过连接 AFC 钱包开始参与 Web4.0 生态。注册 .web4 域名获得数字身份，在数字劳动市场贡献算力获得 AFC 代币，或成为代理商共建全球节点网络。',
            },
          },
        ],
      },
    ],
  };

  return (
    <Script
      id="structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
