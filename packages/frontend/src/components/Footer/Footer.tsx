import Link from 'next/link';
import { useTranslation } from 'react-i18next';

interface FooterProps {
  onSectionChange?: (section: string) => void;
}

export default function Footer({ onSectionChange }: FooterProps) {
  const { t } = useTranslation();

  const quickLinks = [
    { label: t('nav.whitepaper'), sectionId: 'whitepaper' },
    { label: t('nav.poueEngine'), sectionId: 'poue' },
    { label: t('nav.nodes'), sectionId: 'nodes' },
    { label: t('nav.web4Dns'), sectionId: 'dns' },
    { label: t('nav.ecosystem'), sectionId: 'ecosystem' },
    { label: t('nav.column'), sectionId: 'column' },
  ];

  const socialLinks = [
    { label: 'Twitter', href: 'https://twitter.com/net4xyz', icon: '𝕏' },
    { label: 'GitHub', href: 'https://github.com/net4xyz', icon: '⌥' },
    { label: 'Discord', href: 'https://discord.gg/net4xyz', icon: '𝒟' }
  ];

  return (
    <footer className="relative w-full bg-black/50 border-t border-purple-500/30 py-12 neon-border-cyan" role="contentinfo">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 主网格：6列 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8 mb-8">

          {/* Brand — 占 2 列 */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white font-bold text-xl">N</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                net4.xyz
              </span>
            </div>
            <p className="text-small text-gray-400 mb-4 leading-relaxed">
              {t('footer.tagline')}<br />
              {t('footer.taglineSub')}
            </p>
            {/* 社交媒体 */}
            <div className="flex gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-purple-400 hover:border-purple-500/40 transition-all"
                  aria-label={t('footer.visitSocial', { platform: link.label })}
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>

          {/* 快速链接 */}
          <div>
            <h4 className="text-h4 mb-4 text-white font-semibold">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.sectionId}>
                  <button
                    onClick={() => onSectionChange?.(link.sectionId)}
                    className="text-sm text-gray-400 hover:text-purple-400 transition-colors focus:outline-none focus:text-purple-400 text-left"
                    aria-label={t('features.viewDetails', { name: link.label })}
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* 生态入口 — 占 2 列，两列排列 */}
          <div className="lg:col-span-2">
            <h4 className="text-h4 mb-4 text-white font-semibold">
              {t('footer.ecosystem')}
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              {['labor', 'afc', 'soul', 'cloud', 'hardware', 'dex', 'bbs', 'social', 'did', 'get', 'partner'].map((key) => (
                <li key={key}>
                  <a
                    href={`https://${key}.net4.xyz`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-cyan-400 transition-colors flex items-center gap-1 group"
                  >
                    <span>{t(`footer.ecosystemLinks.${key}`)}</span>
                    <span className="text-xs text-gray-600 group-hover:text-cyan-600 transition-colors">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Jason & John 专栏 */}
          <div>
            <h4 className="text-h4 mb-1 text-white font-semibold">{t('footer.columnTitle')}</h4>
            <p className="text-xs text-gray-500 mb-4">{t('footer.columnSub')}</p>
            <ul className="space-y-2">
              {['complete', 'manifesto', 'poue', 'perception', 'afc', 'roadmap'].map((key) => (
                <li key={key}>
                  <button
                    onClick={() => onSectionChange?.('column')}
                    className="text-sm text-gray-400 hover:text-pink-400 transition-colors focus:outline-none focus:text-pink-400 text-left"
                  >
                    {t(`footer.columnLinks.${key}`)}
                  </button>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* 订阅栏 */}
        <div className="border-t border-white/10 pt-8 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-white font-semibold mb-1">{t('footer.subscribe')}</h4>
              <p className="text-sm text-gray-500">{t('footer.subscribeSub')}</p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert(t('footer.subscribeSuccess'));
              }}
              className="flex gap-2 w-full md:w-auto"
            >
              <label htmlFor="newsletter-email" className="sr-only">{t('footer.emailLabel')}</label>
              <input
                id="newsletter-email"
                type="email"
                placeholder={t('footer.emailPlaceholder')}
                className="cyber-input flex-1 md:w-64"
                required
                aria-label={t('footer.emailLabel')}
              />
              <button
                type="submit"
                className="px-5 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 whitespace-nowrap"
              >
                {t('footer.subscribeBtn')}
              </button>
            </form>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-2 text-sm text-gray-500">
          <p>{t('footer.copyright')}</p>
          <p>
            <Link href="/privacy" className="hover:text-purple-400 transition-colors">{t('footer.privacy')}</Link>
            {' · '}
            <Link href="/terms" className="hover:text-purple-400 transition-colors">{t('footer.terms')}</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
