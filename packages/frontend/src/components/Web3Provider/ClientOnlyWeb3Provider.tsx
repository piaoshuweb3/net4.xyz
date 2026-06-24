'use client';

import { ReactNode } from 'react';
import Web3Provider from './Web3Provider';

export default function ClientOnlyWeb3Provider({ children }: { children: ReactNode }) {
  return <Web3Provider>{children}</Web3Provider>;
}
