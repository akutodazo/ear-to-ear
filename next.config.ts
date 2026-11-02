import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Workers の静的アセットとして配信するため、HTML を書き出す（docs/spec.md 技術）
  output: "export",
  // 静的書き出しでは next/image の既定の最適化が使えない
  images: { unoptimized: true },
};

export default nextConfig;
