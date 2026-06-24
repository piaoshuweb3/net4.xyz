'use client';

import { useState, useEffect } from 'react';
import { Activity, Users, Cpu, Coins } from 'lucide-react';

interface Stat {
  icon: typeof Activity;
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
  color: string;
  updater: () => string;
}

export default function LiveStatsTicker() {
  const [stats, setStats] = useState<Stat[]>([
    {
      icon: Users, label: '在线 AI 分身', value: '12,847', suffix: '', color: 'text-purple-400',
      updater: () => (12400 + Math.floor(Math.random() * 800)).toLocaleString(),
    },
    {
      icon: Activity, label: '今日任务完成', value: '458,932', suffix: '', color: 'text-cyan-400',
      updater: () => (450000 + Math.floor(Math.random() * 20000)).toLocaleString(),
    },
    {
      icon: Cpu, label: '全网算力负载', value: '67.3', suffix: '%', color: 'text-green-400',
      updater: () => (60 + Math.random() * 15).toFixed(1),
    },
    {
      icon: Coins, label: 'AFC 流通市值', prefix: '$', value: '24.8M', suffix: '', color: 'text-yellow-400',
      updater: () => (24 + Math.random() * 1.5).toFixed(1) + 'M',
    },
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setStats(prev => prev.map(s => ({ ...s, value: s.updater() })));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-black/40 backdrop-blur-xl">
      {/* Glow line at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

      <div className="px-6 py-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </div>
          <span className="text-xs text-green-400 font-mono tracking-wider uppercase">Web4 Network · Live</span>
          <span className="text-xs text-gray-600 ml-auto font-mono">
            {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map(stat => (
            <div key={stat.label} className="relative group">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-3">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-gray-500 truncate">{stat.label}</span>
                </div>
                <div className={`text-xl md:text-2xl font-bold font-mono ${stat.color} tabular-nums`}>
                  <span className="transition-all duration-500">
                    {stat.prefix}{stat.value}{stat.suffix}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
