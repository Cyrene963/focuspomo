"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { writeLocalRawSnapshotKey } from "@/lib/cloudSync";

type Theme = "light" | "dark";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "light", toggle: () => {} });
export const useTheme = () => useContext(ThemeCtx);

function initialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const saved = window.localStorage.getItem("fp-theme");
    return saved === "dark" || saved === "light" ? saved : "light";
  } catch {
    return "light";
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#17110E" : "#FFF8F0");
    try { writeLocalRawSnapshotKey("fp-theme", theme); } catch {}
  }, [theme]);

  return (
    <ThemeCtx.Provider value={{ theme, toggle: () => setTheme(t => t === "light" ? "dark" : "light") }}>
      {children}
    </ThemeCtx.Provider>
  );
}
