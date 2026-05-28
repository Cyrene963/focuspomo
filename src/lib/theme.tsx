"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { writeLocalRawSnapshotKey } from "@/lib/cloudSync";

type Theme = "light" | "dark";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "light", toggle: () => {} });
export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fp-theme") as Theme;
      if (saved) setTheme(saved);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { writeLocalRawSnapshotKey("fp-theme", theme); } catch {}
  }, [theme]);

  return (
    <ThemeCtx.Provider value={{ theme, toggle: () => setTheme(t => t === "light" ? "dark" : "light") }}>
      {children}
    </ThemeCtx.Provider>
  );
}
