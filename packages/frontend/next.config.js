const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 生产构建启用 ESLint 和 TypeScript 检查
  eslint: {
    ignoreDuringBuilds: false,
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  // 启用压缩
  compress: true,

  // 启用 HTTP Keep-Alive 连接
  httpAgentOptions: {
    keepAlive: true,
  },

  // 生产构建优化
  productionBrowserSourceMaps: false,
  swcMinify: true,

  // ============================================================
  // Turbopack 兼容配置
  // 注意：Turbopack 的 resolveAlias 对 pnpm 绝对路径支持有限
  // 模块解析回退到 webpack 配置处理
  // ============================================================
  experimental: {
    turbo: {},
  },

  // ============================================================
  // webpack 配置（仅在不使用 --turbo 时生效）
  // ============================================================
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }

    // 确保 resolve 和 fallback 存在
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      '@react-native-async-storage/async-storage': false,
      'react-native': false,
      'react-native-web': false,
      'pino-pretty': false,
      'buffer': false,
      'crypto': false,
      'stream': false,
      'assert': false,
      'http': false,
      'https': false,
      'os': false,
      'url': false,
      'util': false,
      'zlib': false,
      'path': false,
      'fs': false,
      'net': false,
      'tls': false,
      'child_process': false,
      // @metamask/sdk 依赖 cross-fetch，pnpm 虚拟 store 中需要显式 fallback
      'cross-fetch': path.resolve(__dirname, '../../node_modules/.pnpm/cross-fetch@4.1.0/node_modules/cross-fetch/dist/cross-fetch.js'),
    };

    // 添加 pnpm 虚拟 store 路径到 resolve.modules
    const pnpmStorePath = path.resolve(__dirname, '../../node_modules/.pnpm');
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
      pnpmStorePath,
    ];

    // 使用 NormalModuleReplacementPlugin 处理模块替换
    const { NormalModuleReplacementPlugin } = require('webpack');
    config.plugins.push(
      new NormalModuleReplacementPlugin(
        /@react-native-async-storage\/async-storage/,
        path.resolve(__dirname, 'src/utils/empty-module.js')
      )
    );

    // 修复 node:crypto 引用问题（@metamask/sdk 等依赖使用 node: 协议前缀）
    // Webpack 无法处理 "node:" URI scheme，需要映射回 "crypto"
    config.plugins.push(
      new NormalModuleReplacementPlugin(
        /^node:crypto$/,
        require.resolve('crypto')
      )
    );

    // 修复 @metamask/sdk 的模块解析问题
    const crossFetchPath = path.resolve(
      __dirname,
      '../../node_modules/.pnpm/@metamask+sdk@0.33.1/node_modules/cross-fetch/dist/browser-ponyfill.js'
    );
    config.plugins.push(
      new NormalModuleReplacementPlugin(
        /^cross-fetch$/,
        crossFetchPath
      )
    );

    // 添加 resolve.alias 确保 @metamask/sdk 使用 CJS 版本
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@metamask/sdk': path.resolve(
        __dirname,
        '../../node_modules/.pnpm/@metamask+sdk@0.33.1/node_modules/@metamask/sdk/dist/node/cjs/metamask-sdk.js'
      ),
    };

    // 添加 ProvidePlugin 确保 Buffer 在浏览器端可用
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
