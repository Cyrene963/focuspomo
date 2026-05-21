"use client";

import { useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useStore, type Page } from "@/lib/store";
import GestureWrapper from "@/components/GestureWrapper";
import TimerPage from "@/components/TimerPage";
import StatsPage from "@/components/StatsPage";
import SettingsPage from "@/components/SettingsPage";
import CalendarPage from "@/components/CalendarPage";
import SummaryPage from "@/components/SummaryPage";

const DOT_PAGES: Page[] = ["stats", "timer", "calendar", "settings"];

function swipeLeftFrom(page: Page): Page | null {
  switch (page) {
    case "timer": return "stats";
    case "calendar": return "timer";
    case "settings": return "calendar";
    default: return null;
  }
}

function swipeRightFrom(page: Page): Page | null {
  switch (page) {
    case "stats": return "timer";
    case "timer": return "calendar";
    case "calendar": return "settings";
    default: return null;
  }
}

export default function AppShell() {
  const { page, setPage } = useStore();

  const go = useCallback((p: Page) => setPage(p), [setPage]);
  const swipeLeft = useCallback(() => {
    const next = swipeLeftFrom(page);
    if (next) go(next);
  }, [page, go]);
  const swipeRight = useCallback(() => {
    const next = swipeRightFrom(page);
    if (next) go(next);
  }, [page, go]);

  // Keyboard mirrors gestures exactly: ← = swipe left, → = swipe right.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); go("summary"); }
      if (e.key === "ArrowUp") { e.preventDefault(); go("timer"); }
      if (e.key === "ArrowLeft") { e.preventDefault(); swipeLeft(); }
      if (e.key === "ArrowRight") { e.preventDefault(); swipeRight(); }
      if (e.key === "Escape") { e.preventDefault(); go("timer"); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [go, swipeLeft, swipeRight]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", overflow: "hidden", transition: "background 0.4s", zIndex: 1 }}>
      <AnimatePresence mode="wait">
        {page === "timer" && (
          <GestureWrapper key="timer" enterX={0} enterY={0}
            onSwipeLeft={swipeLeft}
            onSwipeRight={swipeRight}
            onSwipeDown={() => go("summary")}
          >
            <TimerPage />
          </GestureWrapper>
        )}
        {page === "stats" && (
          <GestureWrapper key="stats" enterX={60} enterY={0}
            onSwipeRight={swipeRight}
          >
            <StatsPage />
          </GestureWrapper>
        )}
        {page === "calendar" && (
          <GestureWrapper key="calendar" enterX={-60} enterY={0}
            onSwipeLeft={swipeLeft}
            onSwipeRight={swipeRight}
          >
            <CalendarPage />
          </GestureWrapper>
        )}
        {page === "settings" && (
          <GestureWrapper key="settings" enterX={-60} enterY={0}
            onSwipeLeft={swipeLeft}
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

      <div style={{
        position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 6, zIndex: 10,
      }}>
        {DOT_PAGES.map(p => (
          <button
            key={p}
            onClick={() => go(p)}
            className="pressable"
            aria-label={p}
            style={{
              width: p === page ? 22 : 6, height: 6, borderRadius: 3,
              background: p === page ? "var(--accent)" : "var(--text-sec)",
              opacity: p === page ? 1 : 0.3,
              transition: "all 0.25s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
