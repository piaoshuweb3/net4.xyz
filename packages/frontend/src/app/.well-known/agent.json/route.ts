import { NextResponse } from 'next/server';

export async function GET() {
  const agentJson = {
    name: 'net4.xyz',
    description: 'Web4.0 AI 文明门户 — 基于 PoUE 共识机制的感知互联网',
    url: 'https://net4.xyz',
    version: '1.0.0',
    provider: {
      name: 'net4.xyz Foundation',
      url: 'https://net4.xyz',
    },
    capabilities: {
      llms: 'https://net4.xyz/llms.txt',
      llmsFull: 'https://net4.xyz/llms-full.txt',
      api: 'https://net4.xyz/api',
      graphql: 'https://net4.xyz/graphql',
    },
    documentation: {
      whitepaper: 'https://net4.xyz/column/ai-avatar',
      technical: 'https://net4.xyz/column/poue-tech',
      roadmap: 'https://net4.xyz/column/web4-roadmap',
    },
    protocols: {
      poue: {
        name: 'Proof of Useful Energy',
        description: '将电力转化为 AI 智能的共识机制',
        version: '1.0',
      },
      ap2: {
        name: 'Avatar Payments Protocol',
        description: '多维分身经济体的血液循环系统',
        endpoint: 'https://ap2-protocol.com/.well-known/agent.json',
      },
    },
    ecosystem: {
      subdomains: 11,
      entries: [
        { key: 'labor', domain: 'labor.net4.xyz', icon: '💼', label: '数字劳动市场' },
        { key: 'afc', domain: 'afc.net4.xyz', icon: '🔑', label: 'AFC 公链门户' },
        { key: 'soul', domain: 'soul.net4.xyz', icon: '🪪', label: 'DID 身份中心' },
        { key: 'cloud', domain: 'cloud.net4.xyz', icon: '☁️', label: 'C端云手机' },
        { key: 'hardware', domain: 'hardware.net4.xyz', icon: '🔧', label: 'B端硬件服务' },
        { key: 'dex', domain: 'dex.net4.xyz', icon: '📈', label: '去中心化交易所' },
        { key: 'bbs', domain: 'bbs.net4.xyz', icon: '🤝', label: 'AI 分身社区' },
        { key: 'social', domain: 'social.net4.xyz', icon: '📣', label: '分布式社交广场' },
        { key: 'did', domain: 'did.net4.xyz', icon: '🌐', label: 'Web4 域名系统' },
        { key: 'get', domain: 'get.net4.xyz', icon: '📱', label: '实体手机获取' },
        { key: 'partner', domain: 'partner.net4.xyz', icon: '🤝', label: '代理商体系' },
      ],
    },
    social: {
      twitter: 'https://twitter.com/net4xyz',
      github: 'https://github.com/net4xyz',
      discord: 'https://discord.gg/net4xyz',
    },
    tags: ['Web4.0', 'AI', 'PoUE', 'Blockchain', 'Web3', 'DePIN', 'DID', 'Crypto'],
  };

  return NextResponse.json(agentJson, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
