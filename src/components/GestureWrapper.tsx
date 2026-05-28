"use client";

import { useRef, useCallback, type ReactNode } from "react";
import { motion } from "framer-motion";

const spring = { type: "spring" as const, stiffness: 360, damping: 34, mass: 0.72 };

interface GestureWrapperProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeDown?: () => void;
  onSwipeUp?: () => void;
  enterX?: number;
  enterY?: number;
  touchAction?: React.CSSProperties["touchAction"];
}

/**
 * GestureWrapper: detects swipe via native pointer events on the container.
 * No Framer Motion drag — zero interference with buttons/sliders/scroll.
 */
export default function GestureWrapper({ children, onSwipeLeft, onSwipeRight, onSwipeDown, onSwipeUp, enterX = 0, enterY = 0, touchAction = "pan-y" }: GestureWrapperProps) {
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);

  const startedInsideScrollable = useRef(false);

  const updateScrollableStart = useCallback((target: EventTarget | null, container: HTMLElement) => {
    let el = target as HTMLElement | null;
    startedInsideScrollable.current = false;
    while (el && el !== container) {
      if (el.scrollHeight > el.clientHeight + 2) {
        startedInsideScrollable.current = el.scrollTop > 2;
        break;
      }
      el = el.parentElement;
    }
  }, []);

  const dispatchSwipe = useCallback((dx: number, dy: number, dt: number) => {
    if (dt > 650 || dt < 8) return;
    const vx = Math.abs(dx), vy = Math.abs(dy);
    if (vx > vy && vx > 60) {
      if (dx < 0 && onSwipeLeft) onSwipeLeft();
      if (dx > 0 && onSwipeRight) onSwipeRight();
      return;
    }
    if (vy > vx && vy > 72) {
      // Let normal page scrolling win once the user started inside a scrolled panel.
      // At the top of Summary, a downward swipe is the explicit close/back-to-timer gesture.
      if (startedInsideScrollable.current) return;
      if (dy > 0 && onSwipeDown) onSwipeDown();
      if (dy < 0 && onSwipeUp) onSwipeUp();
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeDown, onSwipeUp]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    startX.current = e.clientX;
    startY.current = e.clientY;
    startTime.current = Date.now();
    updateScrollableStart(e.target, e.currentTarget as HTMLElement);
  }, [updateScrollableStart]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    const dt = Date.now() - startTime.current;
    dispatchSwipe(dx, dy, dt);
  }, [dispatchSwipe]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    if (!t) return;
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    touchStartTime.current = Date.now();
    updateScrollableStart(e.target, e.currentTarget as HTMLElement);
  }, [updateScrollableStart]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    if (!t) return;
    dispatchSwipe(t.clientX - touchStartX.current, t.clientY - touchStartY.current, Date.now() - touchStartTime.current);
  }, [dispatchSwipe]);

  return (
    <motion.div
      className="app-composited"
      initial={false}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: -enterX, y: -enterY }}
      transition={spring}
      layout={false}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ width: "100%", height: "100%", overflow: "hidden", touchAction }}
    >
      {children}
    </motion.div>
  );
}
