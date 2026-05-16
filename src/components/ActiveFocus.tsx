"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useTimerStore } from "@/lib/timerStore";
import { motion, AnimatePresence } from "framer-motion";

export function ActiveFocusOverlay() {
  const { state, remaining, interrupt } = useTimerStore();
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<number>(0);
  const holdStartRef = useRef<number>(0);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  const handleHoldStart = useCallback(() => {
    holdStartRef.current = Date.now();
    setHoldProgress(0);
    
    const update = () => {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min(elapsed / 3000, 1); // 3 seconds to complete
      setHoldProgress(progress);
      
      if (progress >= 1) {
        interrupt();
        setHoldProgress(0);
        return;
      }
      holdTimerRef.current = requestAnimationFrame(update);
    };
    holdTimerRef.current = requestAnimationFrame(update);
  }, [interrupt]);

  const handleHoldEnd = useCallback(() => {
    if (holdTimerRef.current) {
      cancelAnimationFrame(holdTimerRef.current);
      holdTimerRef.current = 0;
    }
    setHoldProgress(0);
  }, []);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) cancelAnimationFrame(holdTimerRef.current);
    };
  }, []);

  if (state !== "running" && state !== "paused") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 flex flex-col items-center justify-center gradient-timer-active"
      >
        {/* Timer */}
        <motion.div
          className="timer-display text-8xl font-extrabold text-brown-800"
          animate={state === "paused" ? { opacity: [1, 0.4, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </motion.div>

        {/* Hold to Stop */}
        <div className="mt-16 flex flex-col items-center gap-3">
          {/* Hold button with ring */}
          <div className="relative w-20 h-20">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(74,55,40,0.1)" strokeWidth="3" />
              <circle
                cx="40" cy="40" r="36"
                fill="none"
                stroke="#F06858"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 36}
                strokeDashoffset={2 * Math.PI * 36 * (1 - holdProgress)}
                className="transition-none"
              />
            </svg>
            <button
              onMouseDown={handleHoldStart}
              onMouseUp={handleHoldEnd}
              onMouseLeave={handleHoldEnd}
              onTouchStart={handleHoldStart}
              onTouchEnd={handleHoldEnd}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-white/20 active:bg-white/30 transition-colors"
            >
              <span className="text-2xl">⏸</span>
            </button>
          </div>
          <p className="text-brown-800/40 text-sm font-medium">Hold To Stop Focus</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
