"use client";

import { useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import GestureWrapper from "@/components/GestureWrapper";
import { useStore, type Page } from "@/lib/store";
import { swipeLeftFrom, swipeRightFrom } from "@/lib/pageNavigation";
import TimerPage from "@/components/TimerPage";
import StatsPage from "@/components/StatsPage";
import SettingsPage from "@/components/SettingsPage";
import CalendarPage from "@/components/CalendarPage";
import TasksPage from "@/components/TasksPage";
import SummaryPage from "@/components/SummaryPage";

const DOT_PAGES: Page[] = ["stats", "timer", "tasks", "calendar", "settings"];
const DOT_LABELS: Record<Page, string> = {
  timer: "计时器",
  stats: "统计",
  tasks: "任务",
  calendar: "日历",
  settings: "设置",
  summary: "今日总结",
};

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
        {page === "tasks" && (
          <GestureWrapper key="tasks" enterX={-60} enterY={0}
            onSwipeLeft={swipeLeft}
            onSwipeRight={swipeRight}
            onSwipeDown={() => go("summary")}
          >
            <TasksPage />
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
        position: "absolute", bottom: "max(24px, env(safe-area-inset-bottom))", left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 2, zIndex: 10,
      }}>
        {DOT_PAGES.map(p => (
          <button
            key={p}
            type="button"
            onClick={() => go(p)}
            className="pressable"
            aria-label={DOT_LABELS[p]}
            aria-current={p === page ? "page" : undefined}
            style={{
              width: 44, height: 44, borderRadius: 22,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <span style={{
              width: p === page ? 22 : 6, height: 6, borderRadius: 3,
              background: p === page ? "var(--accent)" : "var(--text-sec)",
              opacity: p === page ? 1 : 0.3,
              transition: "all 0.25s ease",
            }} />
          </button>
        ))}
      </div>
    </div>
  );
}
