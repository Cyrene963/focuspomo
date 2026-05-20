"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import TagSelector from "@/components/TagSelector";
import TomatoPhysics from "@/components/TomatoPhysics";

let audioCtx: AudioContext | null = null;
function playDing(muted: boolean) {
  if (muted) return;
  try {
    if (!audioCtx || audioCtx.state === "closed") audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.type = "sine";
    o.frequency.setValueAtTime(800, audioCtx.currentTime);
    o.frequency.setValueAtTime(1000, audioCtx.currentTime + 0.15);
    o.frequency.setValueAtTime(800, audioCtx.currentTime + 0.3);
    g.gain.setValueAtTime(0.3, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    o.start(); o.stop(audioCtx.currentTime + 0.5);
  } catch {}
}

export default function TimerPage() {
  const { state, selectedTag, remaining, muted, start, interrupt, tick, toggleMute, reset, setPage } = useStore();

  const goStats = useCallback(() => setPage("stats"), [setPage]);
  const goSettings = useCallback(() => setPage("settings"), [setPage]);
  const goSummary = useCallback(() => setPage("summary"), [setPage]);
  const [showTags, setShowTags] = useState(false);
  const [holdActive, setHoldActive] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [dropTrigger, setDropTrigger] = useState<{ completed: boolean; durationSeconds: number } | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevStateRef = useRef(state);

  const isActive = state === "running";
  const isCompleted = state === "completed";
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  // Tick
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => tick(), 500);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isActive, tick]);

  // Completion detection
  useEffect(() => {
    if (prevStateRef.current === "running" && state === "completed") {
      playDing(muted);
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 800);
      try { if (navigator.vibrate) navigator.vibrate(200); } catch {}
      setDropTrigger({ completed: true, durationSeconds: selectedTag.duration });
      setTimeout(() => setDropTrigger(null), 100);
    }
    prevStateRef.current = state;
  }, [state, muted, selectedTag.duration]);

  // Hold-to-stop — cancels if finger moves (swipe detection)
  const holdStartPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isActive) return;
    holdStartPos.current = { x: e.clientX, y: e.clientY };
    setHoldActive(true);
    holdTimerRef.current = setTimeout(() => {
      interrupt();
      setHoldActive(false);
    }, 1500);
  }, [isActive, interrupt]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!holdActive) return;
    const dx = Math.abs(e.clientX - holdStartPos.current.x);
    const dy = Math.abs(e.clientY - holdStartPos.current.y);
    if (dx > 15 || dy > 15) {
      // User is swiping, cancel the hold
      if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
      setHoldActive(false);
    }
  }, [holdActive]);

  const handlePointerUp = useCallback(() => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    setHoldActive(false);
  }, []);

  useEffect(() => () => { if (holdTimerRef.current) clearTimeout(holdTimerRef.current); }, []);

  // Single gradient — covers ENTIRE screen, no split
  const bgColor = isActive
    ? "var(--accent-mid)"
    : "var(--accent-light)";

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    }}>
      {/* ===== SINGLE FULL-SCREEN GRADIENT LAYER ===== */}
      <div style={{
        position: "absolute", inset: 0,
        background: bgColor,
        transition: "background 0.5s ease",
        zIndex: 0,
      }} />

      {/* Physics engine canvas */}
      <TomatoPhysics trigger={dropTrigger} />

      {/* Mute button (running only) */}
      <AnimatePresence>
        {isActive && (
          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => { e.stopPropagation(); toggleMute(); }}
            className="pressable"
            style={{ position: "absolute", right: 20, top: 60, zIndex: 30, padding: 10 }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-sec)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {muted ? (
                <><path d="M11 5L6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></>
              ) : (
                <><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" /></>
              )}
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ===== CONTENT LAYER (z-index 1) ===== */}
      <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* IDLE STATE */}
        <AnimatePresence>
          {!isActive && !isCompleted && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.3 }}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}
            >
              <div style={{ flex: 1, minHeight: 80 }} />

              {/* Timer circle */}
              <div style={{
                width: "clamp(200px, 45vw, 380px)",
                height: "clamp(200px, 45vw, 380px)",
                borderRadius: "50%",
                border: "1.5px solid rgba(180,150,130,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span className="timer-number" style={{
                  fontSize: "clamp(3.5rem, 12vw, 6rem)",
                }}>
                  {mm}:{ss}
                </span>
              </div>

              {/* Tag selector */}
              <motion.button
                onClick={(e) => { e.stopPropagation(); setShowTags(true); }}
                className="pressable"
                style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 20 }}
              >
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: selectedTag.color }} />
                <span style={{ fontSize: "clamp(15px, 3vw, 20px)", fontWeight: 600, color: "var(--text)" }}>{selectedTag.name}</span>
                <svg width="14" height="14" viewBox="0 0 8 12" fill="none" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round"><path d="M1 1l5 5-5 5" /></svg>
              </motion.button>

              {/* Mode dots */}
              <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
                {["Focus", "Short", "Long", "Custom"].map((_, i) => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: i === 0 ? "var(--text)" : "transparent",
                    outline: i === 0 ? "none" : "1.5px solid var(--text-sec)",
                    opacity: i === 0 ? 1 : 0.3,
                  }} />
                ))}
              </div>

              <div style={{ flex: 1, minHeight: 40 }} />

              {/* Start button */}
              <motion.button
                onClick={(e) => { e.stopPropagation(); start(); }}
                className="pressable" whileTap={{ scale: 0.94 }}
                style={{
                  marginBottom: 100,
                  width: "clamp(200px, 55vw, 260px)",
                  height: "clamp(52px, 9vh, 62px)",
                  borderRadius: 999,
                  background: "var(--text)",
                  color: "var(--bg)",
                  fontSize: "clamp(16px, 3vw, 20px)",
                  fontWeight: 700,
                  boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
                }}
              >
                Start {selectedTag.name}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RUNNING STATE */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <motion.span
                className="timer-number"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                style={{
                  fontSize: "clamp(5rem, 15vw, 15rem)",
                }}
              >
                {mm}:{ss}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* COMPLETED STATE */}
        <AnimatePresence>
          {isCompleted && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                style={{ fontSize: 72 }}>🍅</motion.div>
              <span style={{ fontSize: "clamp(24px, 5vw, 36px)", fontWeight: 800, color: "var(--text)" }}>Well done!</span>
              <span style={{ fontSize: 17, color: "var(--text-sec)" }}>+1 🍅</span>
              <div style={{ display: "flex", gap: 14, marginTop: 28 }}>
                <motion.button whileTap={{ scale: 0.94 }} onClick={(e) => { e.stopPropagation(); reset(); }}
                  style={{ padding: "14px 32px", borderRadius: 28, background: "var(--leaf)", color: "#FFF", fontSize: 16, fontWeight: 700 }}>
                  Start Break
                </motion.button>
                <motion.button whileTap={{ scale: 0.94 }} onClick={(e) => { e.stopPropagation(); reset(); }}
                  style={{ padding: "14px 32px", borderRadius: 28, background: "var(--separator)", color: "var(--text)", fontSize: 16, fontWeight: 600 }}>
                  Skip
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== FULL-SCREEN OVERLAY: HOLD-TO-STOP + SWIPE ===== */}
      {isActive && (
        <div
          onPointerDown={(e) => {
            handlePointerDown(e);
            // Also track for swipe
            holdStartPos.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={(e) => {
            // Check for swipe FIRST
            const dx = e.clientX - holdStartPos.current.x;
            const dy = e.clientY - holdStartPos.current.y;
            const vx = Math.abs(dx), vy = Math.abs(dy);
            if (vx > vy && vx > 60) {
              // Horizontal swipe — cancel hold, navigate
              if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
              setHoldActive(false);
              if (dx < 0) goStats();
              if (dx > 0) goSettings();
              return;
            }
            if (vy > vx && dy > 80) {
              // Swipe DOWN — cancel hold, go to summary
              if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
              setHoldActive(false);
              goSummary();
              return;
            }
            // Not a swipe — normal hold-to-stop release
            handlePointerUp();
          }}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ position: "absolute", inset: 0, zIndex: 20, touchAction: "none", cursor: "pointer", background: "transparent" }}
        >
          {/* Progress bar + text */}
          <div style={{
            position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          }}>
            <span style={{
              fontSize: 14, fontWeight: 500, color: holdActive ? "var(--text)" : "var(--text-sec)",
              whiteSpace: "nowrap", opacity: holdActive ? 1 : 0.5, transition: "all 0.3s",
            }}>
              Hold To Stop {selectedTag.name}
            </span>
            <div style={{
              width: 200, height: 5, borderRadius: 3,
              background: "var(--separator)", overflow: "hidden",
            }}>
              <div style={{
                height: "100%", borderRadius: 3, background: "var(--accent)",
                width: holdActive ? "100%" : "0%",
                transition: holdActive ? "width 1.5s linear" : "width 0.15s ease-out",
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Completion flash */}
      {showFlash && <div className="completion-flash" />}

      {/* Tag selector modal */}
      <AnimatePresence>
        {showTags && <TagSelector onClose={() => setShowTags(false)} />}
      </AnimatePresence>
    </div>
  );
}
