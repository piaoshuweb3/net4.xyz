'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAccount } from 'wagmi';
import { checkAdminAccess } from '../../utils/admin-auth';
import { 
  Users, FileText, Crown, Wallet, Server, 
  BarChart3, Settings, LogOut, Menu, X,
  ChevronLeft, ChevronRight, Shield
} from 'lucide-react';

export default function AdminRouteLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { address } = useAccount();
  const { isAdmin: isAdminUser, adminAddress } = checkAdminAccess(address);
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
        {/* Admin Status */}
        {address ? (
          <div className={`mx-4 mb-1 rounded-lg px-3 py-2 text-xs ${isAdminUser ? 'bg-green-900/30 border border-green-800/50' : 'bg-yellow-900/20 border border-yellow-800/50'}`}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Shield className={`w-3 h-3 ${isAdminUser ? 'text-green-400' : 'text-yellow-400'}`} />
              <span className={isAdminUser ? 'text-green-400' : 'text-yellow-400'}>
                {isAdminUser ? '✅ 终极管理员' : '⚠️ 非管理员'}
              </span>
            </div>
            {!isCollapsed && <div className="text-gray-500 font-mono">{address.slice(0,6)}...{address.slice(-4)}</div>}
          </div>
        ) : !isCollapsed ? (
          <div className="mx-4 px-3 py-2 text-xs text-gray-500">🔒 请连接钱包验证</div>
        ) : null}
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
