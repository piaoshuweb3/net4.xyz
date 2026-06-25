/**
 * 内容管理 API — Vercel serverless 兼容
 * GET  /api/content     → 获取全部内容列表
 * POST /api/content     → 创建新内容 + 上传到 IPFS
 * PUT  /api/content/[id] → 更新内容
 * DELETE /api/content/[id] → 删除内容
 */

import { NextRequest, NextResponse } from 'next/server';

// 内存存储（生产环境替换为数据库）
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

let contentStore: ContentItem[] = [
  {
    id: 'c0',
    title: 'Web4.0 白皮书',
    type: 'article',
    status: 'published',
    body: '# Web4.0 感知互联网\n\nAI 不再是工具，而是文明。',
    summary: 'Web4.0 感知互联网核心白皮书',
    tags: ['Web4.0', 'PoUE', 'AI'],
    author: 'admin',
    ipfsCid: null,
    views: 12500,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
];

const now = () => new Date().toISOString();

export async function GET() {
  return NextResponse.json({
    items: contentStore.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    total: contentStore.length,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, type = 'article', summary = '', body: content = '', tags = [], author = 'admin' } = body;

    if (!title) {
      return NextResponse.json({ error: '标题不能为空' }, { status: 400 });
    }

    const id = `c${Date.now().toString(36)}`;
    const item: ContentItem = {
      id,
      title,
      type,
      status: 'draft',
      body: content,
      summary,
      tags,
      author,
      ipfsCid: null,
      views: 0,
      createdAt: now(),
      updatedAt: now(),
    };

    // Try IPFS upload
    try {
      const { ipfsCid } = await pushToIPFS(item);
      if (ipfsCid) {
        item.ipfsCid = ipfsCid;
      }
    } catch {
      // IPFS not configured — continue without
    }

    contentStore.unshift(item);
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: '创建失败: ' + (err as Error).message }, { status: 500 });
  }
}

/** 上传内容到 IPFS */
async function pushToIPFS(item: ContentItem): Promise<{ ipfsCid: string | null }> {
  const PINATA_API = 'https://api.pinata.cloud';
  const key = process.env.PINATA_API_KEY;
  const secret = process.env.PINATA_API_SECRET;
  if (!key || !secret) return { ipfsCid: null };

  try {
    const content = JSON.stringify({ title: item.title, type: item.type, body: item.body, summary: item.summary, tags: item.tags, author: item.author, createdAt: item.createdAt }, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const formData = new FormData();
    formData.append('file', blob, `${item.id}.json`);

    const res = await fetch(`${PINATA_API}/pinning/pinFileToIPFS`, {
      method: 'POST',
      headers: { pinata_api_key: key, pinata_secret_api_key: secret },
      body: formData,
    });
    if (res.ok) {
      const r = await res.json() as { IpfsHash: string };
      return { ipfsCid: r.IpfsHash };
    }
  } catch (e) {
    console.error('[Content] IPFS push failed:', e);
  }
  return { ipfsCid: null };
}

export const runtime = 'nodejs';
