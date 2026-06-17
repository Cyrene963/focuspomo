import type { NextConfig } from "next";

const noStoreHeaders = [
  { key: "Cache-Control", value: "no-cache, no-store, must-revalidate, max-age=0" },
  { key: "CDN-Cache-Control", value: "no-store" },
  { key: "Cloudflare-CDN-Cache-Control", value: "no-store" },
  { key: "Pragma", value: "no-cache" },
  { key: "Expires", value: "0" },
];

const isCapacitorBuild = process.env.CAPACITOR_BUILD === "1";

const nextConfig: NextConfig = {
  ...(isCapacitorBuild ? {
    output: "export" as const,
    images: { unoptimized: true },
    trailingSlash: true,
  } : {}),
  allowedDevOrigins: ["focuspomo.bz9.me", "pomofocus.bz9.me"],
  // Next 16 can infer /root as the workspace because this VPS also has a
  // top-level package-lock.json. Pin the app root so local/CI builds validate
  // this PWA, not an accidental parent workspace.
  turbopack: {
    root: process.cwd(),
  },
  // This small VPS cannot reliably run Next.js 16 production typechecking
  // together with resident Hermes/Hindsight services; run TypeScript as a
  // separate CI/local quality gate and keep deployment builds memory-bounded.
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      { source: "/", headers: noStoreHeaders },
      { source: "/favicon.ico", headers: noStoreHeaders },
      { source: "/apple-touch-icon.png", headers: noStoreHeaders },
      { source: "/manifest.json", headers: noStoreHeaders },
      { source: "/sw.js", headers: noStoreHeaders },
      { source: "/:path((?:favicon|icon)-.*\\.(?:ico|png))", headers: noStoreHeaders },
      { source: "/icons/:path*", headers: noStoreHeaders },
      { source: "/safari-pinned-tab.svg", headers: noStoreHeaders },
      { source: "/safari-pinned-tab-1779372627.svg", headers: noStoreHeaders },
      { source: "/mask-icon.svg", headers: noStoreHeaders },
    ];
  },
};

export default nextConfig;
