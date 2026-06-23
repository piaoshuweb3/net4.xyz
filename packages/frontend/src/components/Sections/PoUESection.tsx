'use client';

import { useTranslation } from 'react-i18next';

interface PoUESectionProps {
  data?: Record<string, unknown>;
  onAIQuery: (prompt: string) => void;
}

export default function PoUESection({ data, onAIQuery }: PoUESectionProps) {
  const { t } = useTranslation();
  const pd = data as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('sections.poue.title')}</h1>
      <p className="text-lg text-gray-300 mb-8">{t('sections.poue.subtitle')}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: t('sections.poue.coreNodes'), value: pd?.coreNodes ?? 21, color: 'text-purple-400' },
          { label: t('sections.poue.subNodes'),   value: pd?.subNodes ?? 128,  color: 'text-pink-400' },
          { label: t('sections.poue.normalNodes'), value: pd?.normalNodes ?? '10K+', color: 'text-cyan-400' },
        ].map(s => (
          <div key={s.label} className="glass-cyber rounded-lg p-6 text-center">
            <h3 className={`text-xl font-bold ${s.color} mb-2`}>{s.label}</h3>
            <p className="text-3xl font-bold">{String(s.value)}</p>
          </div>
        ))}
      </div>
      <button
        onClick={() => onAIQuery('请解释 PoUE 共识机制的原理')}
        className="mt-6 px-6 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-bold transition-colors"
      >
        {t('sections.poue.askAI')}
      </button>
    </div>
  );
}
