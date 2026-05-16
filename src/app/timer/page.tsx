"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useTimerStore } from "@/lib/timerStore";
import { motion, AnimatePresence } from "framer-motion";
import { TagSelector } from "@/components/TagSelector";

export default function TimerPage() {
  const { state, selectedTag, remaining, totalDuration, start, pause, resume } = useTimerStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const tick = useTimerStore((s) => s.tick);
  const [showTags, setShowTags] = useState(false);

  useEffect(() => {
    if (state === "running") {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state, tick]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = totalDuration > 0 ? (totalDuration - remaining) / totalDuration : 0;
  const circumference = 2 * Math.PI * 140;

  const handleStartPause = useCallback(() => {
    if (state === "idle") start();
    else if (state === "running") pause();
    else if (state === "paused") resume();
  }, [state, start, pause, resume]);

  const isIdle = state === "idle";
  const isActive = state === "running" || state === "paused";

  if (showTags) {
    return <TagSelector onSelect={() => setShowTags(false)} />;
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden transition-all duration-700"
      style={{
        background: isActive
          ? "radial-gradient(ellipse at 50% 30%, #F06858 0%, #FBF0E3 60%, #FDF6EC 100%)"
          : "linear-gradient(180deg, #FBF0E3 0%, #FDF6EC 50%, #FFFFFF 100%)",
      }}
    >
      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm">
        {/* Timer circle */}
        <div className="relative w-[280px] h-[280px] flex items-center justify-center">
          {/* SVG ring */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 300">
            {/* Background track */}
            <circle
              cx="150" cy="150" r="138"
              fill="none"
              stroke={isActive ? "rgba(240,104,88,0.12)" : "rgba(58,42,28,0.06)"}
              strokeWidth="5"
            />
            {/* Progress arc */}
            <circle
              cx="150" cy="150" r="138"
              fill="none"
              stroke="#F06858"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              className="transition-all duration-1000 ease-linear"
              transform="rotate(-90 150 150)"
            />
          </svg>

          {/* Timer digits */}
          <motion.div
            className="text-center"
            animate={state === "paused" ? { opacity: [1, 0.3, 1] } : {}}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <div
              className="text-[72px] font-extrabold tracking-tight leading-none"
              style={{
                color: "#3A2A1C",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.03em",
              }}
            >
              {String(minutes).padStart(2, "0")}
              <span className="text-[60px]">:</span>
              {String(seconds).padStart(2, "0")}
            </div>
          </motion.div>
        </div>

        {/* Tag selector button */}
        <button
          onClick={() => setShowTags(true)}
          className="flex items-center gap-1.5 transition-colors"
        >
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: selectedTag.color }}
          />
          <span className="text-[15px] font-medium" style={{ color: "#5A4538" }}>
            {selectedTag.name}
          </span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M3 2L7 5L3 8" stroke="#5A4538" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Start Focus button */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleStartPause}
          className="w-[180px] py-[14px] rounded-full font-semibold text-[17px] transition-all duration-200"
          style={{
            backgroundColor: isActive ? "#F06858" : "#3A2A1C",
            color: "white",
            boxShadow: isActive
              ? "0 4px 20px rgba(240,104,88,0.35)"
              : "0 4px 16px rgba(58,42,28,0.2)",
          }}
        >
          {isIdle && "Start Focus"}
          {state === "running" && "Pause"}
          {state === "paused" && "Resume"}
        </motion.button>

        {/* Pomodoro cycle dots */}
        <div className="flex gap-6 mt-2">
          {[0, 1, 2, 3].map((i) => {
            const cycleCount = useTimerStore.getState().cycleCount % 4;
            const filled = i < cycleCount;
            return (
              <motion.div
                key={i}
                initial={false}
                animate={{
                  scale: filled ? 1.15 : 1,
                  backgroundColor: filled ? "#F06858" : "rgba(58,42,28,0.1)",
                }}
                className="w-[10px] h-[10px] rounded-full"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
