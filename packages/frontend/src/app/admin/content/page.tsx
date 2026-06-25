'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Eye, FileText, Image, Video, Upload, X, Globe } from 'lucide-react';

interface ContentItem {
  id: string;
  title: string;
  type: 'article' | 'video' | 'image';
  status: 'draft' | 'published';
  body: string;
  summary: string;
  tags: string[];
  author: string;
  ipfsCid: string | null;
  views: number;
  createdAt: string;
  updatedAt: string;
}

export default function ContentPage() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [form, setForm] = useState({ title: '', type: 'article' as const, body: '', summary: '', tags: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchContents(); }, []);

  async function fetchContents() {
    try {
      const res = await fetch('/api/content');
      const data = await res.json();
      setContents(data.items || []);
    } catch (e) {
      setError('加载内容失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!form.title.trim()) { setError('标题不能为空'); return; }
    setError('');
    setSaving(true);
    try {
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/api/content/${editing.id}` : '/api/content';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) }),
      });
      if (!res.ok) throw new Error();
      await fetchContents();
      setShowModal(false);
      setEditing(null);
      setForm({ title: '', type: 'article', body: '', summary: '', tags: '' });
    } catch {
      setError('保存失败');
    } finally {
      setSaving(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ title: '', type: 'article', body: '', summary: '', tags: '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(item: ContentItem) {
    setEditing(item);
    setForm({ title: item.title, type: item.type, body: item.body || '', summary: item.summary || '', tags: (item.tags || []).join(', ') });
    setError('');
    setShowModal(true);
  }

  const filtered = contents.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.author.toLowerCase().includes(searchQuery.toLowerCase()));

  const getTypeIcon = (type: string) => type === 'video' ? <Video className="w-4 h-4" /> : type === 'image' ? <Image className="w-4 h-4" /> : <FileText className="w-4 h-4" />;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published': return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">已发布</span>;
      case 'draft': return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs">草稿</span>;
      default: return null;
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">内容管理</h1>
          <p className="text-gray-400 text-sm">
            管理文章、视频、图片 · {contents.length} 条内容
            <span className="ml-2 text-xs text-gray-600">
              {contents.some(c => c.ipfsCid) ? '🟢 IPFS 已连接' : '🟡 IPFS 未配置'}
            </span>
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors">
          <Plus className="w-4 h-4" />创建内容
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="搜索内容..." className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm focus:border-purple-500/50 focus:outline-none" />
      </div>

      {/* Content Table */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.02] border-b border-white/[0.06]">
            <tr>
              <th className="text-left p-4 text-gray-400 font-medium">标题</th>
              <th className="text-left p-4 text-gray-400 font-medium hidden md:table-cell">类型</th>
              <th className="text-left p-4 text-gray-400 font-medium hidden md:table-cell">状态</th>
              <th className="text-left p-4 text-gray-400 font-medium hidden lg:table-cell">IPFS</th>
              <th className="text-left p-4 text-gray-400 font-medium hidden lg:table-cell">时间</th>
              <th className="text-right p-4 text-gray-400 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                <td className="p-4">
                  <div className="font-medium text-white">{item.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.author}</div>
                </td>
                <td className="p-4 hidden md:table-cell">
                  <div className="flex items-center gap-2 text-gray-300">{getTypeIcon(item.type)}<span className="capitalize">{item.type === 'article' ? '文章' : item.type === 'video' ? '视频' : '图片'}</span></div>
                </td>
                <td className="p-4 hidden md:table-cell">{getStatusBadge(item.status)}</td>
                <td className="p-4 hidden lg:table-cell">
                  {item.ipfsCid ? (
                    <span className="text-xs font-mono text-cyan-400" title={item.ipfsCid}>{item.ipfsCid.slice(0, 6)}...{item.ipfsCid.slice(-4)}</span>
                  ) : (
                    <span className="text-xs text-gray-600">—</span>
                  )}
                </td>
                <td className="p-4 text-gray-500 text-xs hidden lg:table-cell">{new Date(item.createdAt).toLocaleDateString('zh-CN')}</td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white" title="编辑"><Edit className="w-4 h-4" /></button>
                    <button className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white" title="查看"><Eye className="w-4 h-4" /></button>
                    <button className="p-1.5 hover:bg-red-500/10 rounded text-gray-400 hover:text-red-400" title="删除"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="p-12 text-center text-gray-500">暂无内容，点击右上角"创建内容"开始</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-purple-500/20 bg-[#0a0a0f] shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h3 className="text-lg font-bold text-white">{editing ? '编辑' : '创建'}内容</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
              <div>
                <label className="block text-sm text-gray-400 mb-1">标题 *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:border-purple-500/50 focus:outline-none" placeholder="输入标题..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">类型</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))} className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm">
                    <option value="article">📝 文章</option>
                    <option value="video">🎬 视频</option>
                    <option value="image">🖼️ 图片</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">标签（逗号分隔）</label>
                  <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm" placeholder="Web4.0, PoUE, AI" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">摘要</label>
                <textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} rows={2} className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:border-purple-500/50 focus:outline-none" placeholder="简短描述..." />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">正文（Markdown 格式）</label>
                <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={10} className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm font-mono focus:border-purple-500/50 focus:outline-none" placeholder="# 标题&#10;&#10;正文内容..." />
              </div>
              {form.type === 'video' && (
                <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm">
                  💡 视频请在正文中填写 IPFS CID 或完整 URL，系统将自动嵌入播放器
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-white/[0.06]">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-gray-400 text-sm hover:text-white">取消</button>
              <button onClick={handleSave} disabled={saving} className="ml-auto flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium hover:from-purple-500 hover:to-pink-500 disabled:opacity-50">
                {saving ? '保存中...' : editing ? '💾 更新' : '📝 创建并上传 IPFS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
