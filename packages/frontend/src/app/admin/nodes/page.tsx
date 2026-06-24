'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Server, Shield, Cpu, Zap, AlertTriangle, CheckCircle, XCircle, MoreVertical } from 'lucide-react';

const mockNodes = [
  { id: 1, address: '0x7a2f...3e4d', type: 'core', status: 'active', uptime: '99.9%', tasks: 1234, earnings: 1250, lastActive: '2分钟前' },
  { id: 2, address: '0x8b3c...5f6a', type: 'sub', status: 'active', uptime: '99.5%', tasks: 856, earnings: 450, lastActive: '5分钟前' },
  { id: 3, address: '0x9c4d...7g8b', type: 'sub', status: 'offline', uptime: '95.2%', tasks: 432, earnings: 180, lastActive: '2小时前' },
  { id: 4, address: '0x1e5f...9h0c', type: 'normal', status: 'active', uptime: '98.7%', tasks: 234, earnings: 50, lastActive: '1分钟前' },
  { id: 5, address: '0x2f6a...0i1d', type: 'normal', status: 'penalty', uptime: '80.0%', tasks: 56, earnings: 0, lastActive: '30分钟前' },
];

export default function NodesPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [nodes] = useState(mockNodes);

  const stats = [
    { label: t('nodes.totalNodes'), value: '10,149', icon: Server, color: 'text-purple-400' },
    { label: t('nodes.activeNodes'), value: '8,234', icon: CheckCircle, color: 'text-green-400' },
    { label: t('nodes.offlineNodes'), value: '156', icon: XCircle, color: 'text-red-400' },
    { label: t('nodes.penalized'), value: '23', icon: AlertTriangle, color: 'text-yellow-400' },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'core': return <Shield className="w-4 h-4 text-yellow-400" />;
      case 'sub': return <Cpu className="w-4 h-4 text-orange-400" />;
      case 'normal': return <Zap className="w-4 h-4 text-green-400" />;
      default: return <Server className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'core': return t('nodes.core');
      case 'sub': return t('nodes.sub');
      case 'normal': return t('nodes.normal');
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs"><CheckCircle className="w-3 h-3" />{t('nodes.active')}</span>;
      case 'offline':
        return <span className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs"><XCircle className="w-3 h-3" />{t('nodes.offline')}</span>;
      case 'penalty':
        return <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs"><AlertTriangle className="w-3 h-3" />{t('nodes.penalty')}</span>;
      default:
        return null;
    }
  };

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('nodes.title')}</h1>
            <p className="text-gray-400">{t('nodes.description')}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('nodes.searchPlaceholder')}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
          <select className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white">
            <option value="">{t('nodes.allTypes')}</option>
            <option value="core">{t('nodes.core')}</option>
            <option value="sub">{t('nodes.sub')}</option>
            <option value="normal">{t('nodes.normal')}</option>
          </select>
          <select className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white">
            <option value="">{t('nodes.allStatus')}</option>
            <option value="active">{t('nodes.active')}</option>
            <option value="offline">{t('nodes.offline')}</option>
            <option value="penalty">{t('nodes.penalty')}</option>
          </select>
        </div>

        {/* Nodes Table */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">{t('nodes.node')}</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">{t('nodes.type')}</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">{t('nodes.status')}</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">{t('nodes.uptime')}</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">{t('nodes.tasks')}</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">{t('nodes.earnings')}</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">{t('nodes.lastActive')}</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">{t('nodes.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {nodes.map((node) => (
                <tr key={node.id} className="hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <span className="text-white font-mono">{node.address}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-2 text-gray-400">
                      {getTypeIcon(node.type)}
                      {getTypeLabel(node.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(node.status)}
                  </td>
                  <td className="px-6 py-4 text-gray-400">{node.uptime}</td>
                  <td className="px-6 py-4 text-gray-400">{node.tasks.toLocaleString()}</td>
                  <td className="px-6 py-4 text-green-400">{node.earnings}</td>
                  <td className="px-6 py-4 text-gray-400">{node.lastActive}</td>
                  <td className="px-6 py-4">
                    <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {t('nodes.showing', { start: 1, end: 5, total: 5 })}
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white">
              {t('nodes.prevPage')}
            </button>
            <button className="px-3 py-1 bg-purple-600 text-white rounded-lg">1</button>
            <button className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white">
              {t('nodes.nextPage')}
            </button>
          </div>
        </div>
      </div>);
}