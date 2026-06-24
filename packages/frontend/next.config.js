const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  httpAgentOptions: { keepAlive: true },
  productionBrowserSourceMaps: false,
  swcMinify: true,

  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  experimental: { turbo: {} },

  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }

    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      'react-native': false, 'react-native-web': false,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
      fs: false, net: false, tls: false,
      child_process: false,
      buffer: false, crypto: false,
      stream: false, assert: false,
      http: false, https: false,
      os: false, url: false, util: false, zlib: false, path: false,
    };

    const pnpmStorePath = path.resolve(__dirname, '../../node_modules/.pnpm');
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
      pnpmStorePath,
    ];

    const { NormalModuleReplacementPlugin, ProvidePlugin } = require('webpack');
    config.plugins.push(
      new NormalModuleReplacementPlugin(
        /@react-native-async-storage\/async-storage/,
        path.resolve(__dirname, 'src/utils/empty-module.js')
      ),
      new NormalModuleReplacementPlugin(/^node:crypto$/, require.resolve('crypto'))
    );

    if (!isServer) {
      config.plugins.push(
        new ProvidePlugin({ Buffer: ['buffer', 'Buffer'], process: 'process/browser' })
      );
    }

    return config;
  },
};

module.exports = nextConfig;
