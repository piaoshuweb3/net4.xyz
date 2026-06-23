'use client';

import { useState } from 'react';

// ─────────────────────────────────────────────
// 数据配置：替换 src 为真实嵌入链接即可上线
// ─────────────────────────────────────────────

export interface PodcastEpisode {
  id: string;
  title: string;
  desc: string;
  duration: string;
  date: string;
  tags: string[];
  // 支持三种来源：soundcloud / spotify / 本地文件
  audioSrc?: string;       // 直接 <audio> 播放的 URL（mp3/ogg）
  embedSrc?: string;       // iframe 嵌入 URL（SoundCloud / Spotify）
  platform?: 'soundcloud' | 'spotify' | 'local';
}

export interface VideoItem {
  id: string;
  title: string;
  desc: string;
  duration: string;
  date: string;
  tags: string[];
  thumbnail?: string;      // 封面图 URL
  // 支持三种来源：youtube / bilibili / 本地
  embedSrc?: string;       // iframe 嵌入 URL
  platform?: 'youtube' | 'bilibili' | 'local';
}

export const podcastEpisodes: PodcastEpisode[] = [
  {
    id: 'ep001',
    title: 'EP01 · Web4.0 是什么？Jason & John 深度对谈',
    desc: '两位创始人首次公开对话，从 Web1.0 到 Web4.0 的演进逻辑，以及 net4.xyz 为何是这个时代最重要的基础设施项目。',
    duration: '52:30',
    date: '2024-03-15',
    tags: ['Web4.0', '创始人', '愿景'],
    platform: 'soundcloud',
    // 替换为真实 SoundCloud 嵌入链接
    embedSrc: '',
  },
  {
    id: 'ep002',
    title: 'EP02 · AI 分身：你的数字灵魂',
    desc: '深度解析 AI 分身的技术架构、训练方式和应用场景。当你的 AI 分身比你更了解你自己，会发生什么？',
    duration: '48:15',
    date: '2024-04-02',
    tags: ['AI 分身', '技术', 'DID'],
    platform: 'soundcloud',
    embedSrc: '',
  },
  {
    id: 'ep003',
    title: 'EP03 · PoUE 共识：让算力有意义',
    desc: '为什么 PoW 是对地球的犯罪？PoUE 如何将每一份算力转化为对人类有价值的 AI 计算？节点运营者的真实收益分析。',
    duration: '41:20',
    date: '2024-04-20',
    tags: ['PoUE', '共识机制', '节点'],
    platform: 'soundcloud',
    embedSrc: '',
  },
  {
    id: 'ep004',
    title: 'EP04 · AFC 代币经济学深度解析',
    desc: 'AFC 的总量、分配、通缩机制和价值捕获模型。为什么说 AFC 是 Web4.0 时代最具长期价值的基础资产？',
    duration: '55:40',
    date: '2024-05-08',
    tags: ['AFC', '代币经济', '投资'],
    platform: 'soundcloud',
    embedSrc: '',
  },
  {
    id: 'ep005',
    title: 'EP05 · 数字劳动市场：睡觉时也在赚钱',
    desc: 'labor.net4.xyz 的运作机制，AI 分身如何自动接单完成任务，普通用户如何参与数字劳动经济获得被动收入。',
    duration: '38:55',
    date: '2024-05-25',
    tags: ['劳动市场', 'AI 分身', '被动收入'],
    platform: 'soundcloud',
    embedSrc: '',
  },
  {
    id: 'ep006',
    title: 'EP06 · 代理商机会：Web4.0 的地面部队',
    desc: '全球代理商体系的分润模型、运营策略和成功案例。如何在 Web4.0 浪潮中成为最早的生态建设者？',
    duration: '44:10',
    date: '2024-06-10',
    tags: ['代理商', '商业机会', '生态'],
    platform: 'soundcloud',
    embedSrc: '',
  },
];

export const videoItems: VideoItem[] = [
  {
    id: 'v001',
    title: 'net4.xyz 产品全景演示',
    desc: '15 分钟带你走遍 net4.xyz 的 11 个生态子域，从注册 DID 到 AI 分身接单，完整的用户旅程演示。',
    duration: '15:20',
    date: '2024-03-20',
    tags: ['产品演示', '入门', '全景'],
    platform: 'youtube',
    // 替换为真实 YouTube 视频 ID：https://www.youtube.com/embed/VIDEO_ID
    embedSrc: '',
  },
  {
    id: 'v002',
    title: 'AI 分身系统技术架构讲解',
    desc: '工程师视角深度解析 AI 分身的技术实现：模型选型、训练流程、推理优化和隐私保护方案。',
    duration: '28:45',
    date: '2024-04-05',
    tags: ['技术', 'AI', '架构'],
    platform: 'youtube',
    embedSrc: '',
  },
  {
    id: 'v003',
    title: 'PoUE 节点部署实战教程',
    desc: '手把手教你从零开始部署一个 PoUE 普通节点，包括硬件选购、系统配置、节点注册和收益监控。',
    duration: '35:10',
    date: '2024-04-18',
    tags: ['节点', '教程', 'PoUE'],
    platform: 'bilibili',
    // 替换为真实 Bilibili 视频 BV 号：https://player.bilibili.com/player.html?bvid=BV_ID
    embedSrc: '',
  },
  {
    id: 'v004',
    title: 'AFC 公链主网上线发布会',
    desc: 'AFC 公链主网正式上线发布会完整录像，包含技术团队演讲、现场演示和 Q&A 环节。',
    duration: '1:42:30',
    date: '2024-05-01',
    tags: ['AFC', '主网', '发布会'],
    platform: 'youtube',
    embedSrc: '',
  },
  {
    id: 'v005',
    title: 'Jason 专访：Web4.0 的哲学基础',
    desc: '创始人 Jason 接受媒体专访，深度探讨 Web4.0 的哲学基础、AI 分身的伦理问题和数字文明的未来走向。',
    duration: '22:15',
    date: '2024-05-15',
    tags: ['创始人', '哲学', '专访'],
    platform: 'youtube',
    embedSrc: '',
  },
  {
    id: 'v006',
    title: 'John 专访：从 Web3 到 Web4 的技术跨越',
    desc: '技术创始人 John 讲述从 Web3 到 Web4 的技术演进，以及 net4.xyz 在技术架构上的核心创新。',
    duration: '19:50',
    date: '2024-06-01',
    tags: ['创始人', '技术', 'Web3'],
    platform: 'bilibili',
    embedSrc: '',
  },
];

// ─────────────────────────────────────────────
// 播客播放器组件
// ─────────────────────────────────────────────
function PodcastPlayer({ episode, onClose }: { episode: PodcastEpisode; onClose: () => void }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 border-t border-purple-500/30 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center gap-4">
          {/* 封面 */}
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">🎙️</span>
          </div>
          {/* 信息 */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate">{episode.title}</div>
            <div className="text-xs text-gray-400">Jason &amp; John 专栏 · {episode.duration}</div>
          </div>
          {/* 音频播放器 */}
          <div className="flex-1 max-w-md">
            {episode.audioSrc ? (
              <audio controls className="w-full h-8" src={episode.audioSrc}>
                您的浏览器不支持音频播放
              </audio>
            ) : episode.embedSrc ? (
              <iframe
                src={episode.embedSrc}
                width="100%"
                height="80"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                title={episode.title}
              />
            ) : (
              <div className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-2">
                <span className="text-yellow-400 text-xs">⚠️ 音频链接待配置</span>
                <span className="text-gray-500 text-xs">请在 MediaPage.tsx 中填写 embedSrc</span>
              </div>
            )}
          </div>
          {/* 关闭 */}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
            aria-label="关闭播放器"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 视频播放器组件
// ─────────────────────────────────────────────
function VideoModal({ video, onClose }: { video: VideoItem; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#0a0a0f] rounded-2xl border border-white/10 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 视频区 */}
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          {video.embedSrc ? (
            <iframe
              src={video.embedSrc}
              className="absolute inset-0 w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={video.title}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-900/30 to-pink-900/30">
              <div className="text-6xl mb-4">🎬</div>
              <div className="text-white font-bold text-lg mb-2">{video.title}</div>
              <div className="text-yellow-400 text-sm mb-1">⚠️ 视频链接待配置</div>
              <div className="text-gray-500 text-xs text-center max-w-sm">
                请在 MediaPage.tsx 的 videoItems 中填写 embedSrc
                <br />
                YouTube: https://www.youtube.com/embed/VIDEO_ID
                <br />
                Bilibili: https://player.bilibili.com/player.html?bvid=BV_ID
              </div>
            </div>
          )}
        </div>
        {/* 信息栏 */}
        <div className="p-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-white font-bold text-lg mb-1">{video.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{video.desc}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {video.tags.map(t => (
                <span key={t} className="px-2 py-0.5 text-xs rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">{t}</span>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl flex-shrink-0 mt-1"
            aria-label="关闭视频"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 主页面组件
// ─────────────────────────────────────────────
interface MediaPageProps {
  onBack: () => void;
}

export default function MediaPage({ onBack }: MediaPageProps) {
  const [tab, setTab] = useState<'podcast' | 'video'>('podcast');
  const [playingEpisode, setPlayingEpisode] = useState<PodcastEpisode | null>(null);
  const [playingVideo, setPlayingVideo] = useState<VideoItem | null>(null);

  return (
    <div className="space-y-8 pb-24">
      {/* 返回 */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
      >
        ← 返回专栏
      </button>

      {/* 头部 */}
      <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/10 p-8">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-5xl">🎙️</span>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">Jason &amp; John 媒体中心</h1>
            <p className="text-gray-400 mt-1">播客 · 视频 · Web4.0 深度内容</p>
          </div>
        </div>
        <p className="text-gray-300 leading-relaxed max-w-2xl">
          收听 Jason &amp; John 的深度对谈播客，观看产品演示和技术讲解视频，全方位了解 Web4.0 与 net4.xyz 生态。
        </p>
        {/* 统计 */}
        <div className="flex gap-6 mt-6">
          {[
            { label: '播客期数', value: `${podcastEpisodes.length} 期` },
            { label: '视频数量', value: `${videoItems.length} 个` },
            { label: '总时长', value: '8h+' },
            { label: '更新频率', value: '每两周' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-xl font-bold text-purple-400">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 bg-white/5 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('podcast')}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
            tab === 'podcast'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🎙️ 播客
        </button>
        <button
          onClick={() => setTab('video')}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
            tab === 'video'
              ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🎬 视频
        </button>
      </div>

      {/* 播客列表 */}
      {tab === 'podcast' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">全部播客</h2>
            <div className="flex gap-2 text-xs text-gray-500">
              <span>订阅：</span>
              {['Spotify', 'Apple Podcasts', 'SoundCloud'].map(p => (
                <button key={p} className="text-purple-400 hover:text-purple-300 transition-colors">{p}</button>
              ))}
            </div>
          </div>

          {podcastEpisodes.map((ep, idx) => (
            <div
              key={ep.id}
              className={`glass-cyber rounded-xl p-5 transition-all hover:bg-white/10 ${
                playingEpisode?.id === ep.id ? 'border-purple-500/50 bg-purple-500/5' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* 序号 / 播放按钮 */}
                <button
                  onClick={() => setPlayingEpisode(playingEpisode?.id === ep.id ? null : ep)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                    playingEpisode?.id === ep.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-purple-600/30 hover:text-purple-300'
                  }`}
                  aria-label={playingEpisode?.id === ep.id ? '暂停' : '播放'}
                >
                  {playingEpisode?.id === ep.id ? (
                    <span className="text-lg">⏸</span>
                  ) : (
                    <span className="text-lg">▶</span>
                  )}
                </button>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-white font-bold text-sm leading-snug">{ep.title}</h3>
                    <span className="text-xs text-gray-500 flex-shrink-0">{ep.duration}</span>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed mb-3 line-clamp-2">{ep.desc}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-600">{ep.date}</span>
                    {ep.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 text-xs rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 展开的播放器（当前播放中） */}
              {playingEpisode?.id === ep.id && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  {ep.audioSrc ? (
                    <audio controls autoPlay className="w-full" src={ep.audioSrc}>
                      您的浏览器不支持音频播放
                    </audio>
                  ) : ep.embedSrc ? (
                    <iframe
                      src={ep.embedSrc}
                      width="100%"
                      height="166"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      title={ep.title}
                    />
                  ) : (
                    <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-4 text-center">
                      <div className="text-yellow-400 text-sm font-bold mb-1">⚠️ 音频链接待配置</div>
                      <div className="text-gray-500 text-xs">
                        在 <code className="text-purple-400">MediaPage.tsx</code> 的 podcastEpisodes[{idx}] 中填写：
                        <br />
                        <code className="text-cyan-400">audioSrc</code>（直链 mp3）或 <code className="text-cyan-400">embedSrc</code>（SoundCloud/Spotify 嵌入链接）
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 视频列表 */}
      {tab === 'video' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">全部视频</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {videoItems.map((v) => (
              <button
                key={v.id}
                onClick={() => setPlayingVideo(v)}
                className="glass-cyber rounded-xl overflow-hidden text-left hover:scale-[1.02] transition-all group"
              >
                {/* 封面 */}
                <div className="relative w-full bg-gradient-to-br from-purple-900/40 to-pink-900/40" style={{ paddingTop: '56.25%' }}>
                  {v.thumbnail ? (
                    <img
                      src={v.thumbnail}
                      alt={v.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-4xl mb-2">🎬</div>
                      <div className="text-xs text-gray-500">
                        {v.platform === 'youtube' ? '▶ YouTube' : v.platform === 'bilibili' ? '▶ Bilibili' : '▶ 视频'}
                      </div>
                    </div>
                  )}
                  {/* 播放按钮遮罩 */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-2xl ml-1">▶</span>
                    </div>
                  </div>
                  {/* 时长标签 */}
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 rounded text-xs text-white">
                    {v.duration}
                  </div>
                  {/* 平台标签 */}
                  <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold ${
                    v.platform === 'youtube' ? 'bg-red-600 text-white' :
                    v.platform === 'bilibili' ? 'bg-blue-500 text-white' :
                    'bg-gray-700 text-white'
                  }`}>
                    {v.platform === 'youtube' ? 'YouTube' : v.platform === 'bilibili' ? 'Bilibili' : '本地'}
                  </div>
                </div>
                {/* 信息 */}
                <div className="p-4">
                  <h3 className="text-white font-bold text-sm leading-snug mb-2 group-hover:text-purple-300 transition-colors line-clamp-2">
                    {v.title}
                  </h3>
                  <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 mb-3">{v.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">{v.date}</span>
                    <div className="flex gap-1">
                      {v.tags.slice(0, 2).map(t => (
                        <span key={t} className="px-1.5 py-0.5 text-xs rounded bg-pink-500/10 text-pink-400">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 底部播客播放器（固定） */}
      {playingEpisode && (
        <PodcastPlayer episode={playingEpisode} onClose={() => setPlayingEpisode(null)} />
      )}

      {/* 视频弹窗 */}
      {playingVideo && (
        <VideoModal video={playingVideo} onClose={() => setPlayingVideo(null)} />
      )}
    </div>
  );
}
