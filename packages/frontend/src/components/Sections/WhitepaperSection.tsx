'use client';

import { useTranslation } from 'react-i18next';

interface WhitepaperSectionProps {
  data?: Record<string, unknown>;
}

export default function WhitepaperSection({ data }: WhitepaperSectionProps) {
  const { t } = useTranslation();
  const pd = data as Record<string, unknown>;
  const sections = (pd?.sections as Array<{ title: string; content: string }>) || [];

  return (
    <div className="space-y-6">
      <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('sections.whitepaper.title')}</h1>
      <p className="text-lg text-gray-300 mb-8">{t('sections.whitepaper.subtitle')}</p>
      {sections.length > 0 ? (
        sections.map((s, idx) => (
          <div key={idx} className="glass-cyber rounded-lg p-6">
            <h3 className="text-2xl font-bold text-purple-400 mb-3">{s.title}</h3>
            <p className="text-base text-gray-300 leading-relaxed">{s.content}</p>
          </div>
        ))
      ) : (
        <div className="space-y-4">
          {[
            { title: 'AI 分身宣言', content: 'net4.xyz 提出了 AI 分身宣言，每个人都有权拥有属于自己的 AI 分身，实现数字主权与经济自由。' },
            { title: 'Web4.0 感知互联网', content: 'Web4.0 是下一代互联网架构，基于 PoUE 共识机制，将电力转化为对人类有用的 AI 智能，构建感知互联网。' },
            { title: 'AFC 经济模型', content: 'AFC 是 Web4.0 生态的原生代币，支撑全网的价值链接与安全，实现行为即契约、记忆即永生的经济体系。' },
          ].map((s, idx) => (
            <div key={idx} className="glass-cyber rounded-lg p-6">
              <h3 className="text-2xl font-bold text-purple-400 mb-3">{s.title}</h3>
              <p className="text-base text-gray-300 leading-relaxed">{s.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
