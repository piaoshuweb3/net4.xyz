'use client';

import { useState } from 'react';
import { Search, Plus, Edit, Trash2, Eye, Check, FileText, Image, Video } from 'lucide-react';

const mockContent = [
  { id: 1, title: 'Web4.0 白皮书 v4.7', type: 'article', status: 'published', author: 'admin', views: 12500, createdAt: '2024-01-10' },
  { id: 2, title: 'PoUE 共识机制详解', type: 'article', status: 'published', author: 'sarah', views: 8320, createdAt: '2024-01-15' },
  { id: 3, title: '如何成为核心节点', type: 'article', status: 'pending', author: 'michael', views: 0, createdAt: '2024-02-01' },
  { id: 4, title: '产品演示视频', type: 'video', status: 'draft', author: 'john', views: 0, createdAt: '2024-02-05' },
  { id: 5, title: '团队介绍', type: 'image', status: 'published', author: 'admin', views: 5200, createdAt: '2024-02-10' },
];

export default function ContentPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [contents] = useState(mockContent);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'article': return <FileText className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">已发布</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">待审核</span>;
      case 'draft':
        return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs">草稿</span>;
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">内容管理</h1>
            <p className="text-gray-400">管理文章、视频、图片等内容</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors">
            <Plus className="w-4 h-4" />
            创建内容
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '文章', value: '128', color: 'text-blue-400' },
            { label: '视频', value: '45', color: 'text-purple-400' },
            { label: '图片', value: '234', color: 'text-green-400' },
            { label: '待审核', value: '12', color: 'text-yellow-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
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
              placeholder="搜索内容标题..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
          <select className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white">
            <option value="">全部类型</option>
            <option value="article">文章</option>
            <option value="video">视频</option>
            <option value="image">图片</option>
          </select>
          <select className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white">
            <option value="">全部状态</option>
            <option value="published">已发布</option>
            <option value="pending">待审核</option>
            <option value="draft">草稿</option>
          </select>
        </div>

        {/* Content Table */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">内容</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">类型</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">状态</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">作者</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">浏览</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {contents.map((content) => (
                <tr key={content.id} className="hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <div className="text-white font-medium">{content.title}</div>
                    <div className="text-xs text-gray-500">{content.createdAt}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1 text-gray-400">
                      {getTypeIcon(content.type)}
                      {content.type === 'article' ? '文章' : content.type === 'video' ? '视频' : '图片'}
                    </span>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(content.status)}</td>
                  <td className="px-6 py-4 text-gray-400">{content.author}</td>
                  <td className="px-6 py-4 text-gray-400">{content.views.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg" title="预览">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded-lg" title="审核">
                        <Check className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg" title="编辑">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>);
}