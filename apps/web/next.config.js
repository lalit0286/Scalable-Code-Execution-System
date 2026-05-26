/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@code-exec/shared'],
  experimental: {
    optimizePackageImports: ['@monaco-editor/react'],
  },
};

module.exports = nextConfig;
