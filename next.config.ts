import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  serverExternalPackages: [
    'genkit',
    '@genkit-ai/googleai',
    '@genkit-ai/next',
    '@genkit-ai/core',
    '@opentelemetry/sdk-node',
    '@opentelemetry/exporter-jaeger'
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Add alias for ethers5 to ethers
    // This helps resolve issues where dependencies (like @web3modal/base)
    // try to import 'ethers5' expecting it to point to the ethers v5 package.
    if (!config.resolve) {
      config.resolve = {};
    }

    // Ensure alias object exists
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }
    // Set the alias for 'ethers5' to resolve to 'ethers'
    try {
      (config.resolve.alias as Record<string, string | false | string[]>)['ethers5'] = require.resolve('ethers');
    } catch {}

    // Fallbacks for node-specific modules in browser bundle
    if (!config.resolve.fallback) {
      config.resolve.fallback = {};
    }
    config.resolve.fallback['@opentelemetry/exporter-jaeger'] = false;
    config.resolve.fallback['fs'] = false;
    config.resolve.fallback['net'] = false;
    config.resolve.fallback['tls'] = false;

    // Rule to handle .abi files natively in Webpack 5
    config.module.rules.push({
      test: /\.abi$/,
      type: 'asset/source',
    });

    return config;
  },
  async headers() {
    return [
      {
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
          {
            key: 'Permissions-Policy',
            value: 'unload=*',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
