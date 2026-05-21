import { NextResponse, type NextRequest } from "next/server";

const NO_STORE_PATHS = [
  /^\/$/,
  /^\/favicon\.ico$/,
  /^\/apple-touch-icon\.png$/,
  /^\/manifest\.json$/,
  /^\/sw\.js$/,
  /^\/favicon-\d+(?:-\d+)?\.(?:ico|png)$/,
  /^\/icon-\d+-(?:192|512|apple)\.png$/,
  /^\/icons\/icon-(?:192|512)\.png$/,
  /^\/safari-pinned-tab(?:-\d+)?\.svg$/,
  /^\/mask-icon\.svg$/,
];

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  if (NO_STORE_PATHS.some((rx) => rx.test(request.nextUrl.pathname))) {
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
    response.headers.set("CDN-Cache-Control", "no-store");
    response.headers.set("Cloudflare-CDN-Cache-Control", "no-store");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }
  return response;
}

export const config = {
  matcher: [
    "/",
    "/favicon.ico",
    "/apple-touch-icon.png",
    "/manifest.json",
    "/sw.js",
    "/favicon-:path*",
    "/icon-:path*",
    "/icons/:path*",
    "/safari-pinned-tab.svg",
    "/safari-pinned-tab-1779372627.svg",
    "/mask-icon.svg",
  ],
};
