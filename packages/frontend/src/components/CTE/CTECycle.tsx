'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Briefcase, Wallet, ArrowRight, ChevronRight } from 'lucide-react';

export default function CTECycle() {
  const { t } = useTranslation();
  const stepKeys = ['cteStep1', 'cteStep2', 'cteStep3'] as const;
  const iconArr = [Sparkles, Briefcase, Wallet];
  const colorArr = ['from-purple-500 to-pink-500', 'from-cyan-500 to-blue-500', 'from-amber-500 to-orange-500'];
  const bgArr = ['bg-purple-500/10', 'bg-cyan-500/10', 'bg-amber-500/10'];
  const borderArr = ['border-purple-500/30', 'border-cyan-500/30', 'border-amber-500/30'];

  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActiveStep(prev => (prev + 1) % 3), 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono mb-4">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          CTE 循环 · 分身经济引擎
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
          {t('homepage.cteTitle')}
        </h2>
        <p className="text-gray-400 max-w-xl mx-auto text-sm">
          {t('homepage.cteSubtitle')}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        {stepKeys.map((key, i) => {
          const isActive = activeStep === i;
          const Icon = iconArr[i];
          return (
            <div
              key={key} onClick={() => setActiveStep(i)}
              className={`relative rounded-2xl border p-6 cursor-pointer transition-all duration-500 ${
                isActive ? `${borderArr[i]} ${bgArr[i]} scale-[1.02] shadow-lg shadow-purple-500/5` : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
              }`}
            >
              <div className="absolute top-4 right-4 text-4xl font-black text-white/[0.04] select-none">0{i + 1}</div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorArr[i]} flex items-center justify-center mb-4 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className={`text-lg font-bold bg-gradient-to-r ${colorArr[i]} bg-clip-text text-transparent`}>{t(`homepage.${key}`)}</span>
                <span className="text-sm text-gray-500">{t(`homepage.${key}CN`)}</span>
              </div>
              <p className="text-sm text-gray-400 mb-3">{t(`homepage.${key}Sub`)}</p>
              <div className={`overflow-hidden transition-all duration-500 ${isActive ? 'max-h-32 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                <p className="text-xs text-gray-500 leading-relaxed">{t(`homepage.${key}Desc`)}</p>
              </div>
              <div className={`mt-4 h-1 rounded-full bg-gradient-to-r ${colorArr[i]} transition-all duration-500 ${isActive ? 'w-full opacity-100' : 'w-0 opacity-0'}`} />
            </div>
          );
        })}
      </div>

      <div className="hidden md:flex items-center justify-center gap-2">
        {[0, 1, 2].map(i => (
          <button key={i} onClick={() => setActiveStep(i)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${activeStep === i ? 'bg-purple-400 w-6' : 'bg-gray-700 hover:bg-gray-500'}`} />
        ))}
      </div>

      <div className="text-center mt-8">
        <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium text-sm transition-all hover:scale-105">
          {t('homepage.cteCTA')}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
