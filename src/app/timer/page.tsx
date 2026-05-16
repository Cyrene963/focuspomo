"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTimerStore } from "@/lib/timerStore";
import { motion, AnimatePresence } from "framer-motion";

export default function TimerPage() {
  const { state, selectedTag, remaining, totalDuration, start, pause, resume } = useTimerStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const tick = useTimerStore((s) => s.tick);

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background gradient */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 gradient-timer-active pointer-events-none"
            style={{ zIndex: 0 }}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm">
        {/* Timer circle */}
        <div className="relative w-72 h-72 flex items-center justify-center">
          {/* Progress ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 300 300">
            {/* Background ring */}
            <circle
              cx="150" cy="150" r="140"
              fill="none"
              stroke={isActive ? "rgba(240,104,88,0.15)" : "rgba(74,55,40,0.08)"}
              strokeWidth="6"
            />
            {/* Progress ring */}
            <circle
              cx="150" cy="150" r="140"
              fill="none"
              stroke="#F06858"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>

          {/* Timer text */}
          <div className="text-center">
            <motion.div
              className="timer-display text-7xl font-extrabold text-brown-800"
              animate={state === "paused" ? { opacity: [1, 0.5, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </motion.div>
          </div>
        </div>

        {/* Tag selector */}
        <button className="flex items-center gap-1 text-brown-800/70 text-sm font-medium hover:text-brown-800 transition-colors">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedTag.color }} />
          {selectedTag.name}
          <span className="text-xs">›</span>
        </button>

        {/* Start / Pause button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleStartPause}
          className={`w-48 py-4 rounded-pill font-semibold text-lg transition-all duration-200 ${
            isActive
              ? "bg-coral-500 text-white shadow-lg shadow-coral-500/30"
              : "bg-brown-800 text-white shadow-lg shadow-brown-800/20"
          }`}
        >
          {state === "idle" && "Start Focus"}
          {state === "running" && "Pause"}
          {state === "paused" && "Resume"}
        </motion.button>

        {/* Pomodoro cycle indicator */}
        <div className="flex gap-2 mt-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                i < useTimerStore.getState().cycleCount % 4
                  ? "bg-coral-500 scale-110"
                  : "bg-brown-800/15"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
