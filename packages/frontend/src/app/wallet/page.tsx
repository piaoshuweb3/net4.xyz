'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import WalletPanel from '@/components/Wallet/WalletPanel';

export default function WalletPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      {/* 背景效果 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* 内容 */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* 页面标题 */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                {t('walletPage.title')}
              </span>
            </h1>
            <p className="text-gray-400 text-lg mb-4">
              {t('walletPage.subtitle')}
            </p>
            
            {/* 钱包类型说明 */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 max-w-4xl mx-auto">
              <div className="flex items-start gap-3">
                <div className="text-blue-400 text-xl">ℹ️</div>
                <div className="text-left">
                  <h3 className="text-blue-300 font-semibold mb-2">{t('walletPage.infoTitle')}</h3>
                  <div className="text-sm text-gray-300 space-y-2">
                    <p>
                      <strong className="text-cyan-400">{t('walletPage.afcWallet')}</strong>：{t('walletPage.afcWalletDesc')}
                    </p>
                    <p>
                      <strong className="text-purple-400">{t('walletPage.web3Wallet')}</strong>：{t('walletPage.web3WalletDesc')}
                    </p>
                    <p className="text-yellow-400">
                      {t('walletPage.recommendation')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 钱包面板 */}
          <WalletPanel />

          {/* 功能说明 */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-black/40 backdrop-blur-md border border-cyan-500/30 rounded-lg p-6">
              <div className="text-cyan-400 text-3xl mb-3">🔐</div>
              <h3 className="text-xl font-semibold text-cyan-300 mb-2">{t('walletPage.features.secure.title')}</h3>
              <p className="text-gray-400 text-sm">
                {t('walletPage.features.secure.desc')}
              </p>
            </div>

            <div className="bg-black/40 backdrop-blur-md border border-purple-500/30 rounded-lg p-6">
              <div className="text-purple-400 text-3xl mb-3">⚡</div>
              <h3 className="text-xl font-semibold text-purple-300 mb-2">{t('walletPage.features.fast.title')}</h3>
              <p className="text-gray-400 text-sm">
                {t('walletPage.features.fast.desc')}
              </p>
            </div>

            <div className="bg-black/40 backdrop-blur-md border border-pink-500/30 rounded-lg p-6">
              <div className="text-pink-400 text-3xl mb-3">🌐</div>
              <h3 className="text-xl font-semibold text-pink-300 mb-2">{t('walletPage.features.multichain.title')}</h3>
              <p className="text-gray-400 text-sm">
                {t('walletPage.features.multichain.desc')}
              </p>
            </div>
          </div>

          {/* 使用说明 */}
          <div className="mt-12 bg-black/40 backdrop-blur-md border border-cyan-500/30 rounded-lg p-6">
            <h3 className="text-2xl font-semibold text-cyan-300 mb-4">{t('walletPage.guide.title')}</h3>
            <div className="space-y-4 text-gray-400">
              <div>
                <h4 className="text-cyan-400 font-semibold mb-2">{t('walletPage.guide.step1.title')}</h4>
                <p className="text-sm mb-2">{t('walletPage.guide.step1.desc1')}</p>
                <code className="block bg-black/50 p-3 rounded text-cyan-400 text-sm">
                  npx awal@2.10.0 auth login your-email@example.com
                </code>
                <p className="text-sm mt-2">{t('walletPage.guide.step1.desc2')}</p>
              </div>

              <div>
                <h4 className="text-cyan-400 font-semibold mb-2">{t('walletPage.guide.step2.title')}</h4>
                <p className="text-sm">
                  {t('walletPage.guide.step2.desc')}
                </p>
              </div>

              <div>
                <h4 className="text-cyan-400 font-semibold mb-2">{t('walletPage.guide.step3.title')}</h4>
                <p className="text-sm">
                  {t('walletPage.guide.step3.desc')}
                </p>
              </div>

              <div>
                <h4 className="text-cyan-400 font-semibold mb-2">{t('walletPage.guide.step4.title')}</h4>
                <p className="text-sm">
                  {t('walletPage.guide.step4.desc')}
                </p>
              </div>

              <div>
                <h4 className="text-cyan-400 font-semibold mb-2">{t('walletPage.guide.step5.title')}</h4>
                <p className="text-sm">
                  {t('walletPage.guide.step5.desc')}
                </p>
              </div>
            </div>
          </div>

          {/* 技术栈 */}
          <div className="mt-12 bg-black/40 backdrop-blur-md border border-purple-500/30 rounded-lg p-6">
            <h3 className="text-2xl font-semibold text-purple-300 mb-4">{t('walletPage.techStack.title')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-cyan-400 font-semibold">Coinbase</div>
                <div className="text-gray-400 text-sm">{t('walletPage.techStack.coinbase')}</div>
              </div>
              <div className="text-center">
                <div className="text-cyan-400 font-semibold">Base Chain</div>
                <div className="text-gray-400 text-sm">{t('walletPage.techStack.base')}</div>
              </div>
              <div className="text-center">
                <div className="text-cyan-400 font-semibold">awal CLI</div>
                <div className="text-gray-400 text-sm">{t('walletPage.techStack.awal')}</div>
              </div>
              <div className="text-center">
                <div className="text-cyan-400 font-semibold">FastAPI</div>
                <div className="text-gray-400 text-sm">{t('walletPage.techStack.fastapi')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
