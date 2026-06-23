'use client';

import { useState } from 'react';
import { Search, Plus, Edit, Trash2, UserCheck, UserX } from 'lucide-react';
import AdminLayout from '@/components/Admin/AdminLayout';

const mockUsers = [
  { id: 1, email: 'alex@example.com', address: '0x7a2f...3e4d', role: 'admin', status: 'active', createdAt: '2024-01-15' },
  { id: 2, email: 'sarah@example.com', address: '0x8b3c...5f6a', role: 'user', status: 'active', createdAt: '2024-01-20' },
  { id: 3, email: 'michael@example.com', address: '0x9c4d...7g8b', role: 'user', status: 'active', createdAt: '2024-02-01' },
  { id: 4, email: 'john@example.com', address: '0x1e5f...9h0c', role: 'moderator', status: 'active', createdAt: '2024-02-10' },
  { id: 5, email: 'emma@example.com', address: '0x2f6a...0i1d', role: 'user', status: 'banned', createdAt: '2024-02-15' },
];

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [users] = useState(mockUsers);

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">用户管理</h1>
            <p className="text-gray-400">管理平台用户账户和权限</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors">
            <Plus className="w-4 h-4" />
            添加用户
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索用户邮箱或地址..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
          <select className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white">
            <option value="">全部角色</option>
            <option value="admin">管理员</option>
            <option value="moderator">版主</option>
            <option value="user">普通用户</option>
          </select>
          <select className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white">
            <option value="">全部状态</option>
            <option value="active">正常</option>
            <option value="banned">禁用</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">用户</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">角色</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">状态</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">注册时间</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-white font-medium">{user.email}</div>
                      <div className="text-sm text-gray-500 font-mono">{user.address}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                      user.role === 'moderator' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {user.role === 'admin' ? '管理员' : user.role === 'moderator' ? '版主' : '用户'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1 ${
                      user.status === 'active' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {user.status === 'active' ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                      {user.status === 'active' ? '正常' : '禁用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{user.createdAt}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            显示 1-5 条，共 5 条记录
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white">
              上一页
            </button>
            <button className="px-3 py-1 bg-purple-600 text-white rounded-lg">1</button>
            <button className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white">
              下一页
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}