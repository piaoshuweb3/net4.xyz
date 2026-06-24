'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { 
  Users, FileText, Crown, Wallet, Server, 
  BarChart3, Settings, LogOut, Menu, X,
  ChevronLeft, ChevronRight
} from 'lucide-react';

export default function AdminRouteLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { icon: BarChart3, label: t('admin.dashboard'), href: '/admin' },
    { icon: Users, label: t('admin.users'), href: '/admin/users' },
    { icon: FileText, label: t('admin.content'), href: '/admin/content' },
    { icon: Crown, label: t('admin.membership'), href: '/admin/membership' },
    { icon: Wallet, label: t('admin.finance'), href: '/admin/finance' },
    { icon: Server, label: t('admin.nodes'), href: '/admin/nodes' },
    { icon: BarChart3, label: t('admin.stats'), href: '/admin/stats' },
    { icon: Settings, label: t('admin.settings'), href: '/admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-gray-900 border-b border-gray-800 z-40 flex items-center justify-between px-4">
        <span className="text-xl font-bold text-white">{t('admin.title')}</span>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-400 hover:text-white">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
      <aside className={`fixed top-0 left-0 h-full bg-gray-900 border-r border-gray-800 z-50 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
          {!isCollapsed && <span className="text-xl font-bold text-white">{t('admin.title')}</span>}
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="hidden lg:block p-2 text-gray-400 hover:text-white">
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <button className="flex items-center gap-3 w-full px-4 py-3 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-all">
            <LogOut className="w-5 h-5" />
            {!isCollapsed && <span>{t('admin.logout')}</span>}
          </button>
        </div>
      </aside>
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
      <main className={`pt-16 lg:pt-0 transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
