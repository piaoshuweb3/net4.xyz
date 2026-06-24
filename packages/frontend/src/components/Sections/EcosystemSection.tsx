'use client';

import { useTranslation } from 'react-i18next';
import { ecoPages } from '../Ecosystem/EcoDetailPage';

interface EcosystemSectionProps {
  onSelectEco: (key: string) => void;
}

export default function EcosystemSection({ onSelectEco }: EcosystemSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('sections.ecosystem.title')}</h1>
      <p className="text-lg text-gray-300 mb-8">{t('sections.ecosystem.subtitle')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ecoPages.map((item) => (
          <button
            key={item.key}
            onClick={() => onSelectEco(item.key)}
            className="glass-cyber rounded-lg p-5 flex items-center gap-4 hover:bg-white/10 transition-all group text-left"
          >
            <span className="text-3xl">{item.icon}</span>
            <div>
              <div className={`font-bold ${item.accentColor} group-hover:opacity-100 transition-colors`}>{item.title}</div>
              <div className="text-xs text-gray-500 font-mono mt-1">{item.domain}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
