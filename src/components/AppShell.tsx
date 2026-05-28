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

  // Keep the app fitted to iPad Safari's *visible* viewport when the browser toolbar is shown.
  // 100vh is too tall on iPad Safari and makes the whole app look vertically squeezed.
  useEffect(() => {
    const applyViewportHeight = () => {
      const h = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${Math.round(h)}px`);
    };
    applyViewportHeight();
    window.visualViewport?.addEventListener("resize", applyViewportHeight);
    window.visualViewport?.addEventListener("scroll", applyViewportHeight);
    window.addEventListener("resize", applyViewportHeight);
    window.addEventListener("orientationchange", applyViewportHeight);
    return () => {
      window.visualViewport?.removeEventListener("resize", applyViewportHeight);
      window.visualViewport?.removeEventListener("scroll", applyViewportHeight);
      window.removeEventListener("resize", applyViewportHeight);
      window.removeEventListener("orientationchange", applyViewportHeight);
    };
  }, []);

  // Keyboard mirrors page gestures. Vertical summary gestures are timer-only.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" && page === "timer") { e.preventDefault(); go("summary"); }
      if ((e.key === "ArrowDown" || e.key === "Escape") && page === "summary") { e.preventDefault(); go("timer"); }
      if (e.key === "ArrowLeft") { e.preventDefault(); swipeLeft(); }
      if (e.key === "ArrowRight") { e.preventDefault(); swipeRight(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [page, go, swipeLeft, swipeRight]);

  return (
    <div style={{ position: "fixed", inset: 0, height: "var(--app-height, 100dvh)", background: "var(--bg)", overflow: "hidden", transition: "background 0.4s", zIndex: 1 }}>
      <AnimatePresence mode="wait">
        {page === "timer" && (
          <GestureWrapper key="timer" enterX={0} enterY={0}
            onSwipeLeft={swipeLeft}
            onSwipeRight={swipeRight}
            onSwipeUp={() => go("summary")}
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
            touchAction="none"
            onSwipeDown={() => go("timer")}
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
