'use client';

import { useState } from 'react';
import { Search, Globe, ExternalLink, Check, X, Clock, RefreshCw } from 'lucide-react';

interface DomainResult {
  domain: string;
  available: boolean;
  price?: number;
  loading?: boolean;
}

export default function DNSSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<DomainResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [myDomains] = useState([
    { domain: 'ai-avatar.web4', expires: '2025-12-31', status: 'active' },
    { domain: 'soul-crystal.web4', expires: '2025-06-15', status: 'active' },
  ]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchResult({ domain: searchQuery, available: false, loading: true });

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Random availability for demo
    const available = Math.random() > 0.3;
    setSearchResult({
      domain: searchQuery,
      available,
      price: available ? Math.floor(Math.random() * 500 + 100) : undefined,
      loading: false,
    });
    setIsSearching(false);
  };

  const handleRegister = () => {
    if (!searchResult?.available) return;
    // In real app, this would trigger wallet connection and contract call
    alert(`正在注册 ${searchResult.domain}.web4...`);
  };

  return (
    <section id="dns" className="py-24 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-cyan-900/5 to-[#0a0a0f]" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-6">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-cyan-300">Web4 DNS</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-white">Web4</span>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {' '}域名系统
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            拥有你的 .web4 域名，即拥有数字世界的身份主权
          </p>
        </div>

        {/* Search Box */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="输入域名搜索 (不含 .web4)"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-medium hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50"
            >
              {isSearching ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                '搜索'
              )}
            </button>
          </div>

          {/* Search Result */}
          {searchResult && !searchResult.loading && (
            <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-6">
              {searchResult.available ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl font-bold text-white">
                        {searchResult.domain}.web4
                      </span>
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        可注册
                      </span>
                    </div>
                    <div className="text-gray-400">
                      价格: <span className="text-cyan-400 font-bold">${searchResult.price}</span> / 年
                    </div>
                  </div>
                  <button
                    onClick={handleRegister}
                    className="px-6 py-3 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-500 transition-all"
                  >
                    立即注册
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl font-bold text-white">
                        {searchResult.domain}.web4
                      </span>
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center gap-1">
                        <X className="w-3 h-3" />
                        已注册
                      </span>
                    </div>
                    <div className="text-gray-400">
                      该域名已被注册
                    </div>
                  </div>
                  <button className="px-6 py-3 bg-white/10 text-gray-300 rounded-lg font-medium hover:bg-white/20 transition-all">
                    询价
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Domain Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            {
              icon: Globe,
              title: '去中心化解析',
              desc: '基于区块链的域名解析，无法被审查或冻结',
            },
            {
              icon: ExternalLink,
              title: 'NFT 资产化',
              desc: '域名作为 NFT 存储在链上，可自由交易转让',
            },
            {
              icon: Clock,
              title: '永久拥有',
              desc: '一次注册，永久持有，无需续费',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-cyan-500/30 transition-all"
            >
              <feature.icon className="w-8 h-8 text-cyan-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* My Domains */}
        {myDomains.length > 0 && (
          <div className="max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-white mb-4">我的域名</h3>
            <div className="space-y-3">
              {myDomains.map((domain) => (
                <div
                  key={domain.domain}
                  className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-cyan-400" />
                    <div>
                      <div className="font-medium text-white">{domain.domain}</div>
                      <div className="text-sm text-gray-500">到期: {domain.expires}</div>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full">
                    {domain.status === 'active' ? '正常' : domain.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}