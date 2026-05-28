"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { swipeLeftFrom, swipeRightFrom } from "@/lib/pageNavigation";
import TagSelector from "@/components/TagSelector";

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

function notifyDone(enabled: boolean, title: string, body: string) {
  if (!enabled || typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => reg.showNotification(title, { body, icon: "/icon-1779372627-192.png", badge: "/favicon-1779372627-32.png" }))
        .catch(() => new Notification(title, { body, icon: "/icon-1779372627-192.png" }));
    } else {
      new Notification(title, { body, icon: "/icon-1779372627-192.png" });
    }
  } catch {}
}

export default function TimerPage() {
  const { state, session, selectedTag, remaining, muted, vibration, notificationsEnabled, start, startBreak, interrupt, tick, toggleMute, reset, setPage } = useStore();

  const swipeLeft = useCallback(() => {
    const next = swipeLeftFrom("timer");
    if (next) setPage(next);
  }, [setPage]);
  const swipeRight = useCallback(() => {
    const next = swipeRightFrom("timer");
    if (next) setPage(next);
  }, [setPage]);
  const goSummary = useCallback(() => setPage("summary"), [setPage]);
  const [showTags, setShowTags] = useState(false);
  const [holdActive, setHoldActive] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevStateRef = useRef(state);

  const isActive = state === "running";
  const isCompleted = state === "completed";
  const isBreak = session !== "focus";
  const sessionLabel = session === "shortBreak" ? "短休息" : session === "longBreak" ? "长休息" : selectedTag.name;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  // Tick
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => tick(), 1000);
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
      try { if (vibration && navigator.vibrate) navigator.vibrate(200); } catch {}
      notifyDone(notificationsEnabled, isBreak ? "休息结束" : "番茄完成", isBreak ? "可以回到下一轮专注了。" : `${selectedTag.name}完成了，收获一个小番茄。`);
    }
    prevStateRef.current = state;
  }, [state, muted, vibration, notificationsEnabled, selectedTag.name, selectedTag.duration, isBreak]);

  // Hold-to-stop — cancels if finger moves (swipe detection)
  const holdStartPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isActive) return;
    holdStartPos.current = { x: e.clientX, y: e.clientY };
    setHoldActive(true);
    holdTimerRef.current = setTimeout(() => {
      setIsStopping(true);
      setHoldActive(false);
      window.setTimeout(() => {
        interrupt();
        setIsStopping(false);
      }, 140);
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

  const panelTransition = { type: "spring" as const, stiffness: 360, damping: 36, mass: 0.72 };
  const idleTimerSize = "min(clamp(220px, 56vw, 380px), calc(var(--app-height, 100dvh) * 0.42))";

  // Atmospheric fluid gradient
  const bgColor = isActive
    ? "var(--gradient-run)"
    : "var(--gradient-idle)";

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

      {/* Mute button (running only) */}
      <AnimatePresence>
        {isActive && (
          <motion.button
            initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
      <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%", overflow: "hidden" }}>
        <AnimatePresence mode="wait" initial={false}>
          {!isActive && !isCompleted && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.018 }}
              transition={panelTransition}
              style={{ position: "absolute", inset: 0, display: "grid", gridTemplateRows: "minmax(28px, 1fr) auto auto auto minmax(24px, 0.85fr) auto", justifyItems: "center", alignItems: "center", width: "100%", padding: "max(18px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom))", boxSizing: "border-box" }}
            >
              <div />

              {/* Timer circle */}
              <motion.div className="app-composited" style={{
                width: idleTimerSize,
                height: idleTimerSize,
                aspectRatio: "1 / 1",
                flex: "0 0 auto",
                borderRadius: "50%",
                border: "1.5px solid rgba(180,150,130,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span className="timer-number" style={{
                  fontSize: "min(clamp(3.25rem, 11.5vw, 5.8rem), calc(var(--app-height, 100dvh) * 0.12))",
                }}>
                  {mm}:{ss}
                </span>
              </motion.div>

              {/* Tag selector */}
              <motion.button
                onClick={(e) => { e.stopPropagation(); setShowTags(true); }}
                className="pressable"
                style={{
                  marginTop: 20, display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 20px", borderRadius: 999,
                  background: "rgba(0,0,0,0.04)",
                  transition: "all 0.2s",
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: selectedTag.color }} />
                <span style={{ fontSize: "clamp(15px, 3vw, 20px)", fontWeight: 600, color: "var(--text)" }}>{selectedTag.name}</span>
                <svg width="14" height="14" viewBox="0 0 8 12" fill="none" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round"><path d="M1 1l5 5-5 5" /></svg>
              </motion.button>

              <div style={{ marginTop: 24, fontSize: 13, fontWeight: 600, color: "var(--text-sec)" }}>
                完成后会收获一个小番茄
              </div>

              <div />

              {/* Start button */}
              <motion.button
                onClick={(e) => { e.stopPropagation(); start(); }}
                className="pressable" whileTap={{ scale: 0.96 }}
                style={{
                  marginBottom: "max(76px, env(safe-area-inset-bottom))",
                  width: "clamp(200px, 55vw, 260px)",
                  height: "clamp(52px, 9vh, 62px)",
                  borderRadius: 999,
                  background: "var(--text)",
                  color: "var(--bg)",
                  fontSize: "clamp(16px, 3vw, 20px)",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  boxShadow: "0 10px 25px -5px rgba(45,38,37,0.3), 0 4px 10px -2px rgba(0,0,0,0.1)",
                }}
              >
                开始{selectedTag.name}
              </motion.button>
            </motion.div>
          )}

          {isActive && (
            <motion.div
              key="running"
              initial={{ opacity: 0, scale: 0.982 }}
              animate={{ opacity: isStopping ? 0.7 : 1, scale: isStopping ? 0.985 : 1 }}
              exit={{ opacity: 0, scale: 0.982 }}
              transition={panelTransition}
              style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <motion.span
                className="timer-number app-composited"
                transition={panelTransition}
                style={{
                  fontSize: "min(clamp(5rem, 15vw, 15rem), calc(var(--app-height, 100dvh) * 0.22))",
                }}
              >
                {mm}:{ss}
              </motion.span>
              {isBreak && (
                <div style={{ position: "absolute", top: "58%", fontSize: 17, fontWeight: 700, color: "var(--text-sec)" }}>
                  {sessionLabel}
                </div>
              )}
            </motion.div>
          )}

          {isCompleted && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={panelTransition}
              style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                style={{ fontSize: 72 }}>{isBreak ? "☕️" : "🍅"}</motion.div>
              <span style={{ fontSize: "clamp(24px, 5vw, 36px)", fontWeight: 800, color: "var(--text)" }}>{isBreak ? "休息结束" : "完成啦！"}</span>
              <span style={{ fontSize: 17, color: "var(--text-sec)" }}>{isBreak ? "准备进入下一轮专注" : "+1 🍅"}</span>
              <div style={{ display: "flex", gap: 14, marginTop: 28 }}>
                {isBreak ? (
                  <>
                    <motion.button whileTap={{ scale: 0.96 }} onClick={(e) => { e.stopPropagation(); start(); }}
                      style={{ padding: "14px 32px", borderRadius: 28, background: "var(--text)", color: "var(--bg)", fontSize: 16, fontWeight: 700 }}>
                      开始专注
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.96 }} onClick={(e) => { e.stopPropagation(); reset(); }}
                      style={{ padding: "14px 32px", borderRadius: 28, background: "var(--separator)", color: "var(--text)", fontSize: 16, fontWeight: 600 }}>
                      稍后再说
                    </motion.button>
                  </>
                ) : (
                  <>
                    <motion.button whileTap={{ scale: 0.96 }} onClick={(e) => { e.stopPropagation(); startBreak(); }}
                      style={{ padding: "14px 32px", borderRadius: 28, background: "var(--leaf)", color: "#FFF", fontSize: 16, fontWeight: 700 }}>
                      开始休息
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.96 }} onClick={(e) => { e.stopPropagation(); reset(); }}
                      style={{ padding: "14px 32px", borderRadius: 28, background: "var(--separator)", color: "var(--text)", fontSize: 16, fontWeight: 600 }}>
                      跳过
                    </motion.button>
                  </>
                )}
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
              // Horizontal swipe — cancel hold, then reuse the shared relative page handlers.
              if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
              setHoldActive(false);
              if (dx < 0) swipeLeft();
              if (dx > 0) swipeRight();
              return;
            }
            if (vy > vx && dy < -72) {
              // Swipe UP — cancel hold, go to summary
              if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
              setHoldActive(false);
              goSummary();
              return;
            }
            if (vy > vx && dy > 72) {
              // Swipe DOWN — cancel the current timer/break and return to the home timer screen.
              if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
              setHoldActive(false);
              interrupt();
              return;
            }
            // Not a swipe — normal hold-to-stop release
            handlePointerUp();
          }}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ position: "absolute", inset: 0, zIndex: 20, touchAction: "none", cursor: "pointer", background: "transparent", transform: "translateZ(0)" }}
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
              长按停止{sessionLabel}
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
