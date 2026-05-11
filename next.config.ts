import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静态导出 — 整站打成纯 HTML/CSS/JS,scp 上 Apache 即可
  output: 'export',
  // 部署在 selfloom.ai 的子目录 /apps/cgt-calculator/ 下
  basePath: '/apps/cgt-calculator',
  assetPrefix: '/apps/cgt-calculator',
  // 静态导出习惯加 trailingSlash,目录式 URL 对 Apache 直 serve index.html 友好
  trailingSlash: true,
  // 静态导出下 next/image 不能用 server optimizer
  images: { unoptimized: true },
  // 关掉左下角 dev 浮标
  devIndicators: false,
};

export default nextConfig;
