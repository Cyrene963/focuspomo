"use client";

import { useRef, useCallback, type ReactNode } from "react";
import { motion } from "framer-motion";

const spring = { type: "spring" as const, stiffness: 280, damping: 28, mass: 0.9 };

interface GestureWrapperProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeDown?: () => void;
  onSwipeUp?: () => void;
  enterX?: number;
  enterY?: number;
}

/**
 * GestureWrapper: detects swipe via native pointer events on the container.
 * No Framer Motion drag — zero interference with buttons/sliders/scroll.
 */
export default function GestureWrapper({ children, onSwipeLeft, onSwipeRight, onSwipeDown, onSwipeUp, enterX = 0, enterY = 0 }: GestureWrapperProps) {
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);

  const startedInsideScrollable = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    startX.current = e.clientX;
    startY.current = e.clientY;
    startTime.current = Date.now();
    let el = e.target as HTMLElement | null;
    startedInsideScrollable.current = false;
    while (el && el !== e.currentTarget) {
      if (el.scrollHeight > el.clientHeight + 2) {
        startedInsideScrollable.current = el.scrollTop > 2;
        break;
      }
      el = el.parentElement;
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    const dt = Date.now() - startTime.current;
    if (dt > 500 || dt < 10) return;

    const vx = Math.abs(dx), vy = Math.abs(dy);
    if (vx > vy && vx > 60) {
      if (dx < 0 && onSwipeLeft) onSwipeLeft();
      if (dx > 0 && onSwipeRight) onSwipeRight();
    } else if (vy > vx && vy > 80) {
      // Let normal page scrolling win once the user started inside a scrolled panel.
      // At the top of Summary, a downward swipe is the explicit "close sheet" gesture.
      if (startedInsideScrollable.current) return;
      if (dy > 0 && onSwipeDown) onSwipeDown();
      if (dy < 0 && onSwipeUp) onSwipeUp();
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeDown, onSwipeUp]);

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: -enterX, y: -enterY }}
      transition={spring}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      style={{ width: "100%", height: "100%", overflow: "hidden", touchAction: "pan-y" }}
    >
      {children}
    </motion.div>
  );
}
