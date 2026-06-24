const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 生产构建启用 ESLint 和 TypeScript 检查
  eslint: {
    ignoreDuringBuilds: false,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  compress: true,
  httpAgentOptions: { keepAlive: true },
  productionBrowserSourceMaps: false,
  swcMinify: true,

  experimental: {
    turbo: {},
  },

  // 精简 webpack 配置，Metamask SDK 特定 hack 仅在 server 端生效
  webpack: (config, { dev, isServer }) => {
    // 开发模式跳过编译优化
    if (dev) {
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }

    // 基础 fallback — 禁用 Node.js 原生模块
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      'react-native': false,
      'react-native-web': false,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
      fs: false, net: false, tls: false,
      child_process: false,
      buffer: false, crypto: false,
      stream: false, assert: false,
      http: false, https: false,
      os: false, url: false, util: false, zlib: false, path: false,
    };

    // pnpm store 路径
    const pnpmStorePath = path.resolve(__dirname, '../../node_modules/.pnpm');
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
      pnpmStorePath,
    ];

    // NormalModuleReplacement — 仅处理 @react-native-async-storage
    const { NormalModuleReplacementPlugin } = require('webpack');
    config.plugins.push(
      new NormalModuleReplacementPlugin(
        /@react-native-async-storage\/async-storage/,
        path.resolve(__dirname, 'src/utils/empty-module.js')
      )
    );

    // node:crypto 映射 (Metamask SDK 需要)
    config.plugins.push(
      new NormalModuleReplacementPlugin(
        /^node:crypto$/,
        require.resolve('crypto')
      )
    );

    // ProvidePlugin for browser Buffer
    const { ProvidePlugin } = require('webpack');
    if (!isServer) {
      config.plugins.push(
        new ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );
    }

    return config;
  },
};

module.exports = nextConfig;
