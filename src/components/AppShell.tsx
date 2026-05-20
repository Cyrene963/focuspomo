"use client";

import { useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useStore, type Page } from "@/lib/store";
import GestureWrapper from "@/components/GestureWrapper";
import TimerPage from "@/components/TimerPage";
import StatsPage from "@/components/StatsPage";
import SettingsPage from "@/components/SettingsPage";
import SummaryPage from "@/components/SummaryPage";

const DOT_PAGES: Page[] = ["stats", "timer", "settings"];

export default function AppShell() {
  const { page, setPage } = useStore();

  const go = useCallback((p: Page) => setPage(p), [setPage]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", overflow: "hidden", transition: "background 0.4s" }}>
      <AnimatePresence mode="wait">
        {page === "timer" && (
          <GestureWrapper key="timer" enterX={0} enterY={0}
            onSwipeLeft={() => go("stats")}
            onSwipeRight={() => go("settings")}
            onSwipeDown={() => go("summary")}
          >
            <TimerPage />
          </GestureWrapper>
        )}
        {page === "stats" && (
          <GestureWrapper key="stats" enterX={60} enterY={0}
            onSwipeRight={() => go("timer")}
          >
            <StatsPage />
          </GestureWrapper>
        )}
        {page === "settings" && (
          <GestureWrapper key="settings" enterX={-60} enterY={0}
            onSwipeLeft={() => go("timer")}
          >
            <SettingsPage />
          </GestureWrapper>
        )}
        {page === "summary" && (
          <GestureWrapper key="summary" enterX={0} enterY={60}
            onSwipeUp={() => go("timer")}
          >
            <SummaryPage />
          </GestureWrapper>
        )}
      </AnimatePresence>

      {/* Page indicator dots — 3 pages */}
      <div style={{
        position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 6, zIndex: 10,
      }}>
        {DOT_PAGES.map(p => (
          <button
            key={p}
            onClick={() => go(p)}
            className="pressable"
            style={{
              width: p === page ? 22 : 6, height: 6, borderRadius: 3,
              background: p === page ? "var(--accent)" : "var(--text-sec)",
              opacity: p === page ? 1 : 0.3,
              transition: "all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
