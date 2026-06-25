import { http, createConfig } from 'wagmi';
import { mainnet, base, sepolia, baseSepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// WalletConnect project ID (should be in env)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo';

export const config = createConfig({
  chains: [mainnet, base, sepolia, baseSepolia],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
  },
  connectors: [
    injected({
      shimDisconnect: true,
    }),
    walletConnect({
      projectId,
      metadata: {
        name: 'net4.xyz',
        description: 'Web4.0 AI 文明门户',
        url: 'https://net4.xyz',
        icons: ['https://net4.xyz/icon.png'],
      },
    }),
  ],
});

export const supportedChains = {
  mainnet,
  base,
  sepolia,
  baseSepolia,
};

// TokenPocket and Trust Wallet are supported through injected connector
export const isMobileWallet = () => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes('tokenpocket') ||
    ua.includes('trust wallet') ||
    ua.includes('metamask')
  );
};