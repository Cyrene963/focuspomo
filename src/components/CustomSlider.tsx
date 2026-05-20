"use client";

import { useRef, useCallback, useState } from "react";

interface CustomSliderProps {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  color?: string;
  onChange: (v: number) => void;
}

export default function CustomSlider({ label, value, min, max, step = 1, unit = "", color = "var(--accent)", onChange }: CustomSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  const pct = ((value - min) / (max - min)) * 100;

  const calcValue = useCallback((clientX: number) => {
    if (!trackRef.current) return value;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = min + ratio * (max - min);
    return Math.round(raw / step) * step;
  }, [min, max, step, value]);

  const handleDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); // Prevent parent drag
    setActive(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    onChange(calcValue(clientX));

    const handleMove = (ev: MouseEvent | TouchEvent) => {
      const cx = "touches" in ev ? ev.touches[0].clientX : ev.clientX;
      onChange(calcValue(cx));
    };
    const handleUp = () => {
      setActive(false);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove, { passive: true });
    window.addEventListener("touchend", handleUp);
  }, [calcValue, onChange]);

  return (
    <div style={{ width: "100%", padding: "8px 0" }}>
      <div style={{
        textAlign: "right", marginBottom: 6,
        fontSize: 13, fontWeight: 600, color: "var(--text-sec)",
        fontFamily: "var(--font)",
      }}>
        {value}{unit}
      </div>

      <div
        ref={trackRef}
        onMouseDown={handleDown}
        onTouchStart={handleDown}
        style={{
          position: "relative", height: 40,
          display: "flex", alignItems: "center",
          cursor: "pointer", touchAction: "none",
        }}
      >
        {/* Track bg */}
        <div style={{
          position: "absolute", left: 0, right: 0,
          height: 5, borderRadius: 3, background: "var(--separator)",
        }} />
        {/* Track fill */}
        <div style={{
          position: "absolute", left: 0,
          width: `${pct}%`, height: 5, borderRadius: 3,
          background: color,
          transition: active ? "none" : "width 0.1s ease-out",
        }} />
        {/* Thumb */}
        <div style={{
          position: "absolute", left: `${pct}%`,
          transform: `translateX(-50%) scale(${active ? 1.15 : 1})`,
          width: 26, height: 26, borderRadius: "50%",
          background: "#FFF",
          boxShadow: active
            ? "0 4px 16px rgba(232,100,78,0.3), 0 2px 6px rgba(0,0,0,0.1)"
            : "0 2px 8px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)",
          transition: active ? "box-shadow 0.15s" : "left 0.1s ease-out, transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          zIndex: 2,
        }}>
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 8, height: 8, borderRadius: "50%",
            background: color, opacity: active ? 1 : 0.5,
            transition: "opacity 0.2s",
          }} />
        </div>
      </div>
    </div>
  );
}
