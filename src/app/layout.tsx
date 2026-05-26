import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";

const TS = "1779372627";

export const metadata: Metadata = {
  title: "FocusPomo",
  description: "极简专注番茄钟，面向《我的番茄》风格的专注、统计与时间轴体验",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "FocusPomo" },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFF8F0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="icon" href={`/favicon-${TS}.ico`} type="image/x-icon" />
        <link rel="icon" href={`/favicon-${TS}-32.png`} type="image/png" sizes="32x32" />
        <link rel="icon" href={`/favicon-${TS}-16.png`} type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href={`/icon-${TS}-apple.png`} sizes="180x180" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="mask-icon" href={`/safari-pinned-tab-${TS}.svg`} color="#E8644E" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#E8644E" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FFF8F0" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="FocusPomo" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#FFF8F0", overflow: "hidden", minHeight: "100vh" }}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').then(reg=>{if(reg.active){reg.active.postMessage({type:'CACHE_APP_SHELL'})}}).catch(()=>{})})}` }} />
      </body>
    </html>
  );
}
