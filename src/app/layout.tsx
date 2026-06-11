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
  maximumScale: 1, // 禁用双击缩放，避免 300ms 延迟
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
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="152x152" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="167x167" />
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
        <script
          dangerouslySetInnerHTML={{
            // 注册离线 Service Worker。此前这里是一段调试遗留的"杀掉 PWA"脚本
            // (每次加载注销全部 SW 并删光 focuspomo-* 缓存),导致离线打开必白屏。
            // 注册成功后再让 SW 刷新一次 app shell 缓存,保证断网也能启动。
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js',{scope:'/'}).then(reg=>{const tellSW=()=>{(reg.active||navigator.serviceWorker.controller)?.postMessage({type:'CACHE_APP_SHELL'})};if(reg.active){tellSW()}else{navigator.serviceWorker.addEventListener('controllerchange',tellSW,{once:true})}}).catch(()=>{})})}`,
          }}
        />
      </body>
    </html>
  );
}
