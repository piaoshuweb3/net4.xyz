'use client';

import { useState } from 'react';
import { Save, Settings, Bell, Shield, Database, Server, Key, FileText } from 'lucide-react';

const settingsSections = [
  { id: 'general', label: '通用设置', icon: Settings },
  { id: 'notification', label: '通知设置', icon: Bell },
  { id: 'security', label: '安全设置', icon: Shield },
  { id: 'blockchain', label: '区块链设置', icon: Database },
  { id: 'server', label: '服务器设置', icon: Server },
  { id: 'api', label: 'API 设置', icon: Key },
  { id: 'logs', label: '日志查看', icon: FileText },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('general');
  const [settings, setSettings] = useState({
    siteName: 'net4.xyz',
    siteDescription: 'Web4.0 AI 文明门户',
    maintenanceMode: false,
    emailNotifications: true,
    pushNotifications: true,
    twoFactorAuth: true,
    sessionTimeout: 30,
    rpcUrl: 'https://mainnet.base.org',
    chainId: '8453',
    gasLimit: '500000',
    minStakeAmount: '100',
    nodeRewardPercent: '80',
  });

  const handleSave = () => {
    alert('设置已保存');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">系统设置</h1>
            <p className="text-gray-400">配置管理、日志查看</p>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
          >
            <Save className="w-4 h-4" />
            保存设置
          </button>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-1">
              {settingsSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeSection === section.id
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <section.icon className="w-5 h-5" />
                  {section.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {activeSection === 'general' && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-6">
                <h2 className="text-lg font-semibold text-white">通用设置</h2>
                <div>
                  <label className="text-sm text-gray-400 block mb-2">网站名称</label>
                  <input
                    type="text"
                    value={settings.siteName}
                    onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-2">网站描述</label>
                  <textarea
                    value={settings.siteDescription}
                    onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                    rows={3}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white">维护模式</div>
                    <div className="text-sm text-gray-400">开启后网站将显示维护页面</div>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.maintenanceMode ? 'bg-purple-600' : 'bg-gray-700'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      settings.maintenanceMode ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'notification' && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-6">
                <h2 className="text-lg font-semibold text-white">通知设置</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white">邮件通知</div>
                    <div className="text-sm text-gray-400">接收重要事件邮件通知</div>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, emailNotifications: !settings.emailNotifications })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.emailNotifications ? 'bg-purple-600' : 'bg-gray-700'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      settings.emailNotifications ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white">推送通知</div>
                    <div className="text-sm text-gray-400">接收浏览器推送通知</div>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, pushNotifications: !settings.pushNotifications })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.pushNotifications ? 'bg-purple-600' : 'bg-gray-700'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      settings.pushNotifications ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-6">
                <h2 className="text-lg font-semibold text-white">安全设置</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white">双因素认证</div>
                    <div className="text-sm text-gray-400">登录时需要额外验证</div>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, twoFactorAuth: !settings.twoFactorAuth })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.twoFactorAuth ? 'bg-purple-600' : 'bg-gray-700'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      settings.twoFactorAuth ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-2">会话超时 (分钟)</label>
                  <input
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
              </div>
            )}

            {activeSection === 'blockchain' && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-6">
                <h2 className="text-lg font-semibold text-white">区块链设置</h2>
                <div>
                  <label className="text-sm text-gray-400 block mb-2">RPC URL</label>
                  <input
                    type="text"
                    value={settings.rpcUrl}
                    onChange={(e) => setSettings({ ...settings, rpcUrl: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-2">Chain ID</label>
                  <input
                    type="text"
                    value={settings.chainId}
                    onChange={(e) => setSettings({ ...settings, chainId: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-2">Gas Limit</label>
                  <input
                    type="text"
                    value={settings.gasLimit}
                    onChange={(e) => setSettings({ ...settings, gasLimit: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-2">最小抵押金额 (USDT)</label>
                  <input
                    type="text"
                    value={settings.minStakeAmount}
                    onChange={(e) => setSettings({ ...settings, minStakeAmount: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-2">节点奖励比例 (%)</label>
                  <input
                    type="text"
                    value={settings.nodeRewardPercent}
                    onChange={(e) => setSettings({ ...settings, nodeRewardPercent: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
              </div>
            )}

            {activeSection === 'logs' && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">系统日志</h2>
                <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
                  {[
                    '[2024-02-15 10:30:15] INFO: Server started on port 3000',
                    '[2024-02-15 10:30:20] INFO: Database connected',
                    '[2024-02-15 10:31:00] INFO: User alex@example.com logged in',
                    '[2024-02-15 10:32:15] INFO: New node 0x7a2f...3e4d registered',
                    '[2024-02-15 10:35:00] WARN: High memory usage detected',
                    '[2024-02-15 10:40:00] INFO: Backup completed successfully',
                    '[2024-02-15 10:45:00] ERROR: Failed to connect to RPC endpoint',
                    '[2024-02-15 10:45:30] INFO: RPC connection restored',
                  ].map((log, i) => (
                    <div key={i} className={`py-1 ${
                      log.includes('ERROR') ? 'text-red-400' : 
                      log.includes('WARN') ? 'text-yellow-400' : 'text-gray-400'
                    }`}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'server' && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">服务器状态</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">CPU 使用率</div>
                    <div className="text-2xl font-bold text-green-400">45%</div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">内存使用率</div>
                    <div className="text-2xl font-bold text-yellow-400">72%</div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">磁盘使用率</div>
                    <div className="text-2xl font-bold text-purple-400">38%</div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">在线时间</div>
                    <div className="text-2xl font-bold text-cyan-400">7天</div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'api' && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">API 密钥</h2>
                <div className="space-y-4">
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">Production API Key</span>
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">活跃</span>
                    </div>
                    <div className="font-mono text-sm text-gray-400">nk_live_****************************</div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">Development API Key</span>
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">测试</span>
                    </div>
                    <div className="font-mono text-sm text-gray-400">nk_test_****************************</div>
                  </div>
                  <button className="w-full py-2 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 transition-colors">
                    生成新密钥
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>);
}