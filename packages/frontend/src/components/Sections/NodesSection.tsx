'use client';

import { useTranslation } from 'react-i18next';

interface NodesSectionProps {
  data?: Record<string, unknown>;
}

export default function NodesSection({ data }: NodesSectionProps) {
  const { t } = useTranslation();
  const pd = data || {};

  return (
    <div className="space-y-6">
      <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('sections.nodes.title')}</h1>
      <p className="text-lg text-gray-300 mb-8">{t('sections.nodes.subtitle')}</p>
      <div className="glass-cyber rounded-lg p-6">
        <h3 className="text-2xl font-bold text-green-400 mb-4">{t('sections.nodes.networkStatus')}</h3>
        <p className="text-base text-gray-300">{t('sections.nodes.totalNodes')}: {String(pd.totalNodes ?? 1049)}</p>
        <p className="text-base text-gray-300">{t('sections.nodes.activeNodes')}: {String(pd.activeNodes ?? 987)}</p>
      </div>
    </div>
  );
}
