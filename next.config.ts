import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "CDN-Cache-Control", value: "no-cache" },
          { key: "Cloudflare-CDN-Cache-Control", value: "no-cache" },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "CDN-Cache-Control", value: "no-cache" },
          { key: "Cloudflare-CDN-Cache-Control", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
