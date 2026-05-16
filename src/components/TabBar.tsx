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
    <nav className="tab-bar fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-cream-300 z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-all duration-200 ${
                isActive
                  ? "text-coral-500 scale-110"
                  : "text-brown-700/50 hover:text-brown-700"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
