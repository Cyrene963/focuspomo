import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";

const TS = "1779318471";

export const metadata: Metadata = {
  title: "FocusPomo",
  description: "An open-source Pomodoro timer PWA",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: `/favicon-${TS}.ico`, type: "image/x-icon" },
      { url: `/favicon-${TS}-32.png`, type: "image/png", sizes: "32x32" },
      { url: `/favicon-${TS}-16.png`, type: "image/png", sizes: "16x16" },
    ],
    apple: { url: `/icon-${TS}-apple.png`, sizes: "180x180" },
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "FocusPomo" },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#F5F0EB",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "var(--bg)", overflow: "hidden" }}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <script dangerouslySetInnerHTML={{ __html: `
          if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})})}
          // Force Safari to re-evaluate favicon links after page load
          (function(){
            function fix(){
              [
                ['/favicon-${TS}.ico','image/x-icon',null],
                ['/favicon-${TS}-32.png','image/png','32x32'],
                ['/favicon-${TS}-16.png','image/png','16x16'],
                ['/icon-${TS}-apple.png',null,'180x180']
              ].forEach(function(p){
                var l=document.createElement('link');
                l.rel=p[2]?'apple-touch-icon':'icon';
                l.href=p[0]+'?v='+Date.now();
                if(p[1])l.type=p[1];
                if(p[2])l.sizes=p[2];
                document.head.appendChild(l);
              });
            }
            if(document.readyState==='complete')fix();else window.addEventListener('load',fix);
          })();
        `}} />
      </body>
    </html>
  );
}
