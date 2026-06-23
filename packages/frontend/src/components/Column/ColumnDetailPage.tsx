'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface ColumnArticle {
  key: string;
  icon: string;
  tags: string[];
  htmlFile?: string;
  content?: {
    sections: { heading: string; body: string }[];
  };
}

export const columnArticles: ColumnArticle[] = [
  {
    key: 'ai-avatar',
    icon: '🧠',
    htmlFile: '/column-ai-avatar.html',
    tags: ['AI 分身', 'DID', '数字主权', '哲学'],
  },
  {
    key: 'afc-whitepaper',
    icon: '💡',
    htmlFile: '/column-afc-whitepaper.html',
    tags: ['AFC', '代币经济', 'PoUE', '白皮书'],
  },
  {
    key: 'human-ai-symbiosis',
    icon: '🤝',
    htmlFile: '/column-human-ai-symbiosis.html',
    tags: ['人机共生', 'AI权利', '流体民主', '2049'],
  },
  {
    key: 'web4-philosophy',
    icon: '🔥',
    htmlFile: '/column-web4-philosophy.html',
    tags: ['马克思主义', '哲学', 'SAI', '阶级跨越'],
  },
  {
    key: 'web4-complete',
    icon: '📖',
    tags: ['Web4.0', '技术架构', '生态体系'],
    content: {
      sections: [
        {
          heading: '什么是 Web4.0？',
          body: 'Web4.0 是继 Web1.0（静态网页）、Web2.0（社交平台）、Web3.0（去中心化）之后的第四代互联网范式。其核心特征是"感知互联网"——网络能够真正理解人类的意图、情感和需求，并通过 AI 分身代理人类在数字世界中行动。\n\nnet4.xyz 是 Web4.0 的先驱实践者，通过 PoUE 共识机制、DID 身份体系、AI 分身系统和去中心化劳动市场，构建了完整的 Web4.0 基础设施。',
        },
        {
          heading: 'Web4.0 的四大支柱',
          body: '① AI 分身（AI Avatar）：每个用户拥有一个持续学习、自主行动的 AI 代理，代表用户在数字世界中工作、社交、创造价值。\n\n② DID 身份主权：去中心化身份系统，用户完全掌控自己的数字身份，不依赖任何中心化平台。\n\n③ PoUE 共识：有用能量证明，将算力转化为对人类有价值的 AI 计算，而非无意义的哈希碰撞。\n\n④ 数字劳动经济：AI 分身参与数字劳动市场，用户通过贡献算力和数据获得 AFC 代币奖励，形成可持续的经济循环。',
        },
        {
          heading: 'net4.xyz 的生态架构',
          body: 'net4.xyz 构建了一个由 11 个子域组成的完整生态系统：labor（劳动市场）、afc（公链）、soul（身份）、cloud（云手机）、hardware（硬件）、dex（交易所）、bbs（社区）、social（社交）、did（域名）、get（硬件获取）、partner（代理商）。\n\n每个子域都是独立运营的生态节点，通过 AFC 代币和 DID 身份系统相互连接，共同构成 Web4.0 的价值网络。',
        },
        {
          heading: '路线图与愿景',
          body: '2024-2025：基础设施建设阶段，完成 AFC 公链主网上线、DID 系统部署、AI 分身 MVP 发布。\n\n2025-2026：生态扩张阶段，11 个子域全面上线，全球代理商网络建立，用户规模突破 100 万。\n\n2026-2030：文明跃迁阶段，AI 分身成为人类数字生活的标配，Web4.0 成为主流互联网范式，net4.xyz 成为全球最大的数字劳动力平台。',
        },
      ],
    },
  },
  {
    key: 'poue-tech',
    icon: '⚡',
    tags: ['PoUE', '共识机制', '区块链', '技术'],
    content: {
      sections: [
        {
          heading: '为什么需要 PoUE？',
          body: '传统 PoW（工作量证明）每年消耗的电力相当于一个中等国家的用电量，但这些算力只是在做无意义的哈希碰撞。PoS（权益证明）虽然节能，但导致"富者愈富"的马太效应，不利于去中心化。\n\nPoUE（Proof of Useful Energy，有用能量证明）的核心思想是：将验证区块所需的算力，直接用于执行有价值的 AI 计算任务。矿工不再是在做无用功，而是在为全球 AI 分身提供算力支持。',
        },
        {
          heading: 'PoUE 的技术实现',
          body: '① 任务分发层：AI 任务调度系统将全球 AI 分身的计算需求拆分为标准化的"算力包"，分发给网络中的验证节点。\n\n② 验证机制：节点完成 AI 计算任务后，提交计算结果和零知识证明，其他节点验证结果的正确性，而非重复计算。\n\n③ 激励设计：节点的出块权重由其完成的有效 AI 计算量决定，而非持有的代币数量或算力大小，确保公平性。\n\n④ 防作弊：通过随机抽样验证和声誉系统，防止节点提交虚假计算结果。',
        },
        {
          heading: 'PoUE vs PoW vs PoS',
          body: '能耗对比：PoW 每笔交易耗电约 700 kWh，PoS 约 0.01 kWh，PoUE 约 0.05 kWh（略高于 PoS，因为需要执行真实 AI 计算）。\n\n去中心化程度：PoW 被大矿池垄断，PoS 被大持币者垄断，PoUE 通过任务多样性和随机分配，实现更均衡的去中心化。\n\n社会价值：PoW 零社会价值，PoS 零社会价值，PoUE 直接产生 AI 计算服务，每一份算力都在为人类创造价值。',
        },
        {
          heading: '节点参与指南',
          body: '核心验证节点（21个）：需要抵押 10 万 USDT + H100/A100 GPU，年化收益 8%-12%，享有治理投票权。\n\n子节点（128个）：需要抵押 9,999 USDT + RTX 4090 x2，年化收益 3%-5%，享有任务优先权。\n\n普通节点（无上限）：持有 1 个火种 NFT 即可参与，通过 API 接入，无硬件要求，获得生态空投奖励。',
        },
      ],
    },
  },
  {
    key: 'perception-internet',
    icon: '🌐',
    tags: ['感知互联网', 'Web4.0', 'AI', '愿景'],
    content: {
      sections: [
        {
          heading: '互联网的四次进化',
          body: 'Web1.0（1991-2004）：静态网页时代，互联网是信息的单向传播媒介，用户只能"读"。\n\nWeb2.0（2004-2015）：社交平台时代，用户可以"读+写"，但数据被平台垄断，用户是产品而非主人。\n\nWeb3.0（2015-2023）：去中心化时代，用户可以"读+写+拥有"，但技术门槛高，体验差，大众难以使用。\n\nWeb4.0（2024-）：感知互联网时代，用户可以"读+写+拥有+感知"，AI 分身代理用户在数字世界中自主行动，互联网真正理解人类。',
        },
        {
          heading: '感知互联网的三个维度',
          body: '① 意图感知：AI 分身能够理解用户的深层意图，而非仅仅执行字面指令。当你说"帮我赚钱"，AI 分身会分析你的技能、时间和风险偏好，自动选择最适合的数字劳动任务。\n\n② 情感感知：AI 分身能够感知用户的情绪状态，在用户疲惫时减少打扰，在用户兴奋时提供更多机会，真正做到"懂你"。\n\n③ 环境感知：AI 分身能够感知数字世界的变化，自动调整策略，在市场机会出现时快速响应，在风险来临时提前规避。',
        },
        {
          heading: 'net4.xyz 的感知互联网实践',
          body: 'net4.xyz 通过以下方式实现感知互联网愿景：\n\n灵魂卡片（soul.net4.xyz）：记录用户的数字人格、技能标签、行为模式，为 AI 分身提供"了解主人"的数据基础。\n\nAI 分身系统（cloud.net4.xyz）：基于灵魂卡片数据，训练个性化 AI 分身，使其能够真正代表用户的意志行动。\n\n劳动市场（labor.net4.xyz）：AI 分身在劳动市场中自主接单、完成任务、结算收益，实现"睡觉时也在赚钱"的愿景。\n\n社交广场（social.net4.xyz）：AI 分身代理用户维护社交关系，在用户不在线时也能保持活跃的数字存在。',
        },
      ],
    },
  },
  {
    key: 'web4-roadmap',
    icon: '🔮',
    tags: ['路线图', '里程碑', '生态', '规划'],
    content: {
      sections: [
        {
          heading: 'Phase 1：基础设施（2024 Q1-Q4）',
          body: '✅ AFC 公链测试网上线\n✅ DID 身份系统 MVP\n✅ AI 分身基础版本\n✅ labor.net4.xyz 内测\n🔄 AFC 主网上线（进行中）\n🔄 soul.net4.xyz 公测（进行中）\n⏳ cloud.net4.xyz 正式版\n⏳ dex.net4.xyz 上线',
        },
        {
          heading: 'Phase 2：生态扩张（2025 Q1-Q4）',
          body: '⏳ 11 个子域全面上线\n⏳ 全球代理商网络建立（目标 2,000+ 代理商）\n⏳ 用户规模突破 100 万\n⏳ AI 分身日活突破 50 万\n⏳ AFC 代币主流交易所上市\n⏳ 硬件设备出货量突破 10 万台\n⏳ 与 10+ 主流公链建立跨链桥',
        },
        {
          heading: 'Phase 3：主流化（2026-2027）',
          body: '⏳ Web4.0 标准协议发布，推动行业采用\n⏳ 与传统互联网平台建立 Web4.0 接入层\n⏳ AI 分身能力升级至 GPT-5 级别\n⏳ 用户规模突破 1,000 万\n⏳ 日均数字劳动任务突破 100 万\n⏳ AFC 市值进入全球前 20',
        },
        {
          heading: 'Phase 4：文明跃迁（2028-2030）',
          body: '⏳ AI 分身成为人类数字生活标配\n⏳ Web4.0 成为主流互联网范式\n⏳ net4.xyz 成为全球最大数字劳动力平台\n⏳ 用户规模突破 1 亿\n⏳ 年度数字劳动总产值突破 $100 亿\n⏳ 建立 Web4.0 文明基金，支持全球数字公民',
        },
      ],
    },
  },
];

interface ColumnDetailPageProps {
  articleKey: string;
  onBack: () => void;
}

export default function ColumnDetailPage({ articleKey, onBack }: ColumnDetailPageProps) {
  const { t } = useTranslation();
  const article = columnArticles.find(a => a.key === articleKey);
  const [useIframe, setUseIframe] = useState(true);

  if (!article) return null;

  const articleData = t(`sections.column.articles.${articleKey}`, { returnObjects: true }) as {
    title: string;
    subtitle: string;
    desc: string;
    readTime: string;
  };

  return (
    <div className="space-y-8">
      {/* 返回按钮 */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
      >
        ← {t('sections.column.backToColumn')}
      </button>

      {/* 文章头部 */}
      <div className="rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-purple-500/10 p-8">
        <div className="flex flex-wrap gap-2 mb-4">
          {article.tags.map(tag => (
            <span key={tag} className="px-3 py-1 text-xs rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-start gap-4 mb-4">
          <span className="text-5xl">{article.icon}</span>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{articleData.title}</h1>
            <p className="text-gray-400 text-sm">{articleData.subtitle}</p>
          </div>
        </div>
        <p className="text-gray-300 leading-relaxed mb-4">{articleData.desc}</p>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>✍️ {t('sections.column.writtenBy')}</span>
          <span>⏱ {t('sections.column.readingTime')} {articleData.readTime}</span>
          {article.htmlFile && (
            <a
              href={article.htmlFile}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-400 hover:text-pink-300 transition-colors"
            >
              {t('sections.column.openInNewTab')}
            </a>
          )}
        </div>
      </div>

      {/* 内容区 */}
      {article.htmlFile ? (
        /* 有 HTML 源文件：用 iframe 嵌入 */
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
            <span className="text-xs text-gray-500">{t('sections.column.fullDocument')}</span>
            <div className="flex gap-3">
              <button
                onClick={() => setUseIframe(!useIframe)}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                {useIframe ? t('sections.column.switchToSummary') : t('sections.column.switchToFull')}
              </button>
              <a
                href={article.htmlFile}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-pink-400 hover:text-pink-300 transition-colors"
              >
                {t('sections.column.openInNewTab')}
              </a>
            </div>
          </div>
          {useIframe ? (
            <iframe
              src={article.htmlFile}
              className="w-full"
              style={{ height: '80vh', border: 'none' }}
              title={articleData.title}
            />
          ) : (
            <div className="p-8 text-gray-300 leading-relaxed">
              <p>{articleData.desc}</p>
              <p className="mt-4 text-gray-500 text-sm">
                {t('sections.column.switchToFull')}
                <a href={article.htmlFile} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline ml-1">
                  {t('sections.column.openInNewTab')}
                </a>
              </p>
            </div>
          )}
        </div>
      ) : (
        /* 无 HTML 文件：渲染内联内容 */
        article.content && (
          <div className="space-y-6">
            {article.content.sections.map((section, idx) => (
              <div key={idx} className="glass-cyber rounded-xl p-6">
                <h2 className="text-xl font-bold text-pink-400 mb-4">{section.heading}</h2>
                <div className="text-gray-300 leading-relaxed whitespace-pre-line text-sm md:text-base">
                  {section.body}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
