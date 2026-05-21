import type { NextConfig } from "next";

const noStoreHeaders = [
  { key: "Cache-Control", value: "no-cache, no-store, must-revalidate, max-age=0" },
  { key: "CDN-Cache-Control", value: "no-store" },
  { key: "Cloudflare-CDN-Cache-Control", value: "no-store" },
  { key: "Pragma", value: "no-cache" },
  { key: "Expires", value: "0" },
];

const nextConfig: NextConfig = {
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
