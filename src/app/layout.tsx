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
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#E8644E" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FFF8F0" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="FocusPomo" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* Apply saved theme before first paint to avoid a light-mode flash (FOUC) for dark users. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('fp-theme')==='dark'){document.documentElement.classList.add('dark');var m=document.querySelector('meta[name=theme-color]');if(m)m.setAttribute('content','#17110E');}}catch(e){}})();`,
          }}
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: "var(--bg)", overflow: "hidden", minHeight: "100vh" }}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').then(()=>navigator.serviceWorker.ready).then(reg=>{if(reg.active){reg.active.postMessage({type:'CACHE_APP_SHELL'})}}).catch(()=>{})})}` }} />
      </body>
    </html>
  );
}
