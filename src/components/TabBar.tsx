"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", icon: "🏠", label: "Home" },
  { href: "/timer", icon: "⏱", label: "Timer" },
  { href: "/calendar", icon: "📅", label: "Calendar" },
  { href: "/stats", icon: "📊", label: "Stats" },
  { href: "/settings", icon: "⚙️", label: "Settings" },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(253,246,236,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "0.5px solid rgba(58,42,28,0.08)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex justify-around items-center h-[56px] max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-[2px] px-4 py-1 transition-all duration-150"
              style={{
                color: isActive ? "#F06858" : "rgba(58,42,28,0.35)",
              }}
            >
              <span className="text-[20px] leading-none">{tab.icon}</span>
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
