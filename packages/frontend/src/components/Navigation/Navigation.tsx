'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Menu, X, ChevronDown } from 'lucide-react';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher';
import WalletConnectButton from '../Wallet/WalletConnectButton';

interface NavItem {
  labelKey: string;
  href: string;
  sectionId?: string;
  external?: boolean;
  children?: { labelKey: string; href: string; sectionId?: string; external?: boolean }[];
}

const getNavItems = (t: (key: string) => string): NavItem[] => [
  { labelKey: 'nav.home', href: '#home' },
  { 
    labelKey: 'nav.whitepaper', 
    href: '#whitepaper',
    sectionId: 'whitepaper',
    children: [
      { labelKey: 'nav.aiAvatar', href: '#whitepaper', sectionId: 'whitepaper' },
      { labelKey: 'nav.web4Perception', href: '#whitepaper', sectionId: 'whitepaper' },
    ]
  },
  { labelKey: 'nav.poueEngine', href: '#poue', sectionId: 'poue' },
  { labelKey: 'nav.nodes', href: '/admin/nodes', sectionId: 'nodes' },
  { labelKey: 'nav.web4Dns', href: '#dns', sectionId: 'dns' },
  { labelKey: 'nav.afcWallet', href: '/wallet' },
  {
    labelKey: 'nav.ecosystem',
    href: '#ecosystem',
    sectionId: 'ecosystem',
    children: [
      { labelKey: 'nav.labor', href: 'https://labor.net4.xyz', external: true },
      { labelKey: 'nav.afc', href: 'https://afc.net4.xyz', external: true },
      { labelKey: 'nav.soul', href: 'https://soul.net4.xyz', external: true },
      { labelKey: 'nav.cloud', href: 'https://cloud.net4.xyz', external: true },
      { labelKey: 'nav.hardware', href: 'https://hardware.net4.xyz', external: true },
      { labelKey: 'nav.dex', href: 'https://dex.net4.xyz', external: true },
      { labelKey: 'nav.bbs', href: 'https://bbs.net4.xyz', external: true },
      { labelKey: 'nav.social', href: 'https://social.net4.xyz', external: true },
      { labelKey: 'nav.did', href: 'https://did.net4.xyz', external: true },
      { labelKey: 'nav.get', href: 'https://get.net4.xyz', external: true },
      { labelKey: 'nav.partner', href: 'https://partner.net4.xyz', external: true },
    ]
  },
  {
    labelKey: 'nav.column',
    href: '#column',
    sectionId: 'column',
    children: [
      { labelKey: 'nav.humanAiSymbiosis', href: '#column', sectionId: 'col-human-ai-symbiosis' },
      { labelKey: 'nav.web4Philosophy', href: '#column', sectionId: 'col-web4-philosophy' },
      { labelKey: 'nav.web4Complete', href: '#column', sectionId: 'col-web4-complete' },
      { labelKey: 'nav.aiAvatarManifesto', href: '#column', sectionId: 'col-ai-avatar' },
      { labelKey: 'nav.poueTech', href: '#column', sectionId: 'col-poue-tech' },
      { labelKey: 'nav.perceptionInternet', href: '#column', sectionId: 'col-perception-internet' },
      { labelKey: 'nav.afcWhitepaper', href: '#column', sectionId: 'col-afc-whitepaper' },
      { labelKey: 'nav.web4Roadmap', href: '#column', sectionId: 'col-web4-roadmap' },
      { labelKey: 'nav.media', href: '#column', sectionId: 'media' },
    ]
  },
  { labelKey: 'nav.team', href: '#team', sectionId: 'team' },
  { labelKey: 'nav.admin', href: '/admin' },
];

export default function Navigation({ onSectionChange }: { onSectionChange?: (section: string | null) => void }) {
  const { t } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const navRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Web3 连接 — 由 WalletConnectButton 组件统一处理
  const navItems = getNavItems(t);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isMobileMenuOpen) return;
      
      const menuItems = mobileMenuRef.current?.querySelectorAll('button');
      if (!menuItems) return;

      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % menuItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + menuItems.length) % menuItems.length);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (isMobileMenuOpen && mobileMenuRef.current) {
      const firstButton = mobileMenuRef.current.querySelector('button');
      (firstButton as HTMLElement)?.focus();
    }
  }, [isMobileMenuOpen]);

  const handleNavClick = (item: NavItem) => {
    if (item.href.startsWith('http')) {
      window.open(item.href, '_blank', 'noopener,noreferrer');
      setIsMobileMenuOpen(false);
      return;
    }
    if (item.href.startsWith('/')) {
      window.location.href = item.href;
      setIsMobileMenuOpen(false);
      return;
    }
    if (item.sectionId) {
      onSectionChange?.(item.sectionId);
    } else if (item.labelKey === 'nav.home') {
      onSectionChange?.(null);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav
      ref={navRef}
      aria-label="Main navigation"
      style={{ position: 'fixed', zIndex: 100 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'glass-cyber border-b border-purple-500/20' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold text-xl">N</span>
            </div>
            <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              net4.xyz
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => (
              <div
                key={item.labelKey}
                className="relative"
                onMouseEnter={() => item.children && setActiveDropdown(item.labelKey)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  onClick={() => handleNavClick(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNavClick(item);
                    } else if (e.key === 'ArrowDown' && item.children) {
                      e.preventDefault();
                      setActiveDropdown(item.labelKey);
                    }
                  }}
                  aria-expanded={activeDropdown === item.labelKey}
                  aria-haspopup={item.children ? 'true' : undefined}
                  className="flex items-center px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  {t(item.labelKey)}
                  {item.children && <ChevronDown className="ml-1 w-4 h-4" />}
                </button>
                
                {item.children && activeDropdown === item.labelKey && (
                  <div className={`cyber-dropdown ${item.labelKey === 'nav.ecosystem' ? 'cyber-dropdown--wide' : ''}`}>
                    {item.children.map((child) => (
                      <button
                        key={child.labelKey}
                        onClick={() => handleNavClick(child as NavItem)}
                        className="cyber-dropdown-item text-left"
                      >
                        {t(child.labelKey)}
                        {child.external && <span className="ml-1 text-xs text-gray-500">↗</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Wallet & Language */}
          <div className="hidden md:flex items-center space-x-4">
            <LanguageSwitcher />
            <WalletConnectButton />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsMobileMenuOpen(!isMobileMenuOpen);
              }
            }}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="md:hidden p-2 text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-lg"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div 
          id="mobile-menu"
          ref={mobileMenuRef}
          role="menu"
          aria-label="Mobile navigation menu"
          className="md:hidden glass-cyber border-t border-white/10"
        >
          <div className="px-4 py-4 space-y-2">
            {navItems.map((item, index) => (
              <button
                key={item.labelKey}
                role="menuitem"
                tabIndex={0}
                onClick={() => handleNavClick(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleNavClick(item);
                  }
                }}
                className={`w-full text-left px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all focus:outline-none focus:bg-white/5 focus:text-white ${
                  focusedIndex === index ? 'bg-white/5 text-white' : ''
                }`}
              >
                {t(item.labelKey)}
              </button>
            ))}
            <div className="pt-4 border-t border-white/10">
              <div className="px-4 mb-4">
                <LanguageSwitcher />
              </div>
              <div className="px-4">
                <WalletConnectButton />
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}