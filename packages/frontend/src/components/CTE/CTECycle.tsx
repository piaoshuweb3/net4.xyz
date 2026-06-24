'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Briefcase, Wallet, ArrowRight, ChevronRight } from 'lucide-react';

const steps = [
  {
    icon: Sparkles,
    title: 'Create',
    titleCN: '创造分身',
    subtitle: '打造你的 AI 数字生命体',
    desc: '注册 .web4 身份，创建属于你的 AI 分身。它将学会你的知识、习惯和决策模式，成为你在数字世界的延展。',
    color: 'from-purple-500 to-pink-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
  },
  {
    icon: Briefcase,
    title: 'Task',
    titleCN: '执行任务',
    subtitle: '释放认知劳动力的价值',
    desc: '你的分身 7×24 小时自动接单，完成数据分析、内容创作、代码审查等认知任务，将你的知识转化为数字资产。',
    color: 'from-cyan-500 to-blue-500',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
  },
  {
    icon: Wallet,
    title: 'Earn',
    titleCN: '持续收益',
    subtitle: '你的认知即资本',
    desc: '每一次任务完成都通过智能合约自动结算 AFC 代币。你的知识和判断力，成为真正可量化的数字财富。',
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
];

export default function CTECycle() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep(prev => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative">
      {/* Section header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono mb-4">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          CTE 循环 · 分身经济引擎
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
          创造 · 执行 · 收益
        </h2>
        <p className="text-gray-400 max-w-xl mx-auto text-sm">
          Web4.0 的核心经济循环：每个人的认知都能转化为持续收益
        </p>
      </div>

      {/* Steps grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        {steps.map((step, i) => {
          const isActive = activeStep === i;
          const Icon = step.icon;
          return (
            <div
              key={step.title}
              onClick={() => setActiveStep(i)}
              className={`relative rounded-2xl border p-6 cursor-pointer transition-all duration-500 ${
                isActive
                  ? `${step.border} ${step.bg} scale-[1.02] shadow-lg shadow-purple-500/5`
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
              }`}
            >
              {/* Step number */}
              <div className="absolute top-4 right-4 text-4xl font-black text-white/[0.04] select-none">
                0{i + 1}
              </div>

              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
                <Icon className="w-6 h-6 text-white" />
              </div>

              {/* Title */}
              <div className="flex items-baseline gap-2 mb-1">
                <span className={`text-lg font-bold bg-gradient-to-r ${step.color} bg-clip-text text-transparent`}>
                  {step.title}
                </span>
                <span className="text-sm text-gray-500">{step.titleCN}</span>
              </div>

              <p className="text-sm text-gray-400 mb-3">{step.subtitle}</p>

              {/* Expandable description */}
              <div className={`overflow-hidden transition-all duration-500 ${isActive ? 'max-h-32 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
              </div>

              {/* Progress indicator */}
              <div className={`mt-4 h-1 rounded-full bg-gradient-to-r ${step.color} transition-all duration-500 ${isActive ? 'w-full opacity-100' : 'w-0 opacity-0'}`} />
            </div>
          );
        })}
      </div>

      {/* Cycle arrows between steps (desktop) */}
      <div className="hidden md:flex items-center justify-center gap-2">
        {[0, 1, 2].map(i => (
          <button
            key={i}
            onClick={() => setActiveStep(i)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              activeStep === i
                ? 'bg-purple-400 w-6'
                : 'bg-gray-700 hover:bg-gray-500'
            }`}
          />
        ))}
      </div>

      {/* CTA */}
      <div className="text-center mt-8">
        <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium text-sm transition-all hover:scale-105">
          开始你的分身经济之旅
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
