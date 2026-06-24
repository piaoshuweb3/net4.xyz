'use client';

import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import { ReactNode, useEffect, useState } from 'react';

export default function I18nProvider({ children }: { children: ReactNode }) {
  // 强制在客户端挂载后才渲染，避免 SSR 语言不一致导致 hydration 错误
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 从 localStorage 恢复语言设置
    const savedLang = localStorage.getItem('i18nextLng');
    if (savedLang && savedLang !== i18n.language) {
      i18n.changeLanguage(savedLang);
    }
  }, []);

  if (!mounted) {
    // SSR 阶段返回默认中文内容，避免闪烁
    return (
      <I18nextProvider i18n={i18n}>
        {children}
      </I18nextProvider>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
}