'use client';

import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';

interface DNSSectionProps {
  searchDomain: string;
  onSearchDomainChange: (value: string) => void;
  onSearch: () => void;
  loading: boolean;
}

export default function DNSSection({ searchDomain, onSearchDomainChange, onSearch, loading }: DNSSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('sections.dns.title')}</h1>
      <p className="text-lg text-gray-300 mb-8">{t('sections.dns.subtitle')}</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={searchDomain}
          onChange={(e) => onSearchDomainChange(e.target.value)}
          placeholder={t('sections.dns.searchPlaceholder')}
          className="cyber-input flex-1"
        />
        <button
          onClick={onSearch}
          disabled={loading}
          className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-bold transition-colors flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          {t('sections.dns.search')}
        </button>
      </div>
    </div>
  );
}
