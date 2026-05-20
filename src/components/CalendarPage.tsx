"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 7am - 11pm

function startOfWeek(d: Date) { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); r.setHours(0,0,0,0); return r; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString(); }

// Demo records
const DEMO = [
  { id: "d1", tagName: "Focus", tagColor: "#E07A45", startTime: new Date().setHours(9,0), endTime: new Date().setHours(9,25), actualDuration: 1500, completed: true, tagId: "f" },
  { id: "d2", tagName: "Work", tagColor: "#55A67A", startTime: new Date().setHours(11,0), endTime: new Date().setHours(12,0), actualDuration: 3600, completed: true, tagId: "w" },
  { id: "d3", tagName: "Study", tagColor: "#3ABFBF", startTime: new Date().setHours(14,30), endTime: new Date().setHours(15,15), actualDuration: 2700, completed: true, tagId: "s" },
];

export default function CalendarPage() {
  const { history } = useStore();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = addDays(weekStart, 7);

  const allRecords = useMemo(() => {
    const real = history.filter(r => r.startTime >= weekStart.getTime() && r.startTime < weekEnd.getTime());
    return real.length > 0 ? real : DEMO;
  }, [history, weekStart, weekEnd]);

  const weekLabel = () => {
    const s = weekStart, e = addDays(weekStart, 6);
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${m[s.getMonth()]} ${s.getDate()} – ${m[e.getMonth()]} ${e.getDate()}`;
  };

  const ROW_H = 64;

  return (
    <div style={{ height: "100%", width: "100%", background: "var(--bg)", display: "flex", flexDirection: "column", transition: "background 0.4s" }}>
      {/* Header */}
      <div style={{ padding: "52px 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="pressable" style={{ padding: 8 }}>
            <svg width="16" height="16" viewBox="0 0 8 12" fill="none" stroke="var(--text-sec)" strokeWidth="2" strokeLinecap="round"><path d="M6 1L1 6l5 5" /></svg>
          </button>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", minWidth: 160, textAlign: "center" }}>{weekLabel()}</span>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="pressable" style={{ padding: 8 }}>
            <svg width="16" height="16" viewBox="0 0 8 12" fill="none" stroke="var(--text-sec)" strokeWidth="2" strokeLinecap="round"><path d="M1 1l5 5-5 5" /></svg>
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "48px repeat(7, 1fr)", padding: "4px 8px 12px", flexShrink: 0 }}>
        <div />
        {days.map((day, i) => {
          const isToday = sameDay(day, today);
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: isToday ? "var(--accent)" : "var(--text-sec)" }}>{DAY_NAMES[i]}</span>
              <span style={{
                width: 30, height: 30, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: isToday ? 700 : 500,
                background: isToday ? "var(--accent)" : "transparent",
                color: isToday ? "#FFF" : "var(--text)",
                transition: "all 0.2s",
              }}>{day.getDate()}</span>
            </div>
          );
        })}
      </div>

      {/* Timeline — no hard lines, just colored blocks */}
      <div style={{ flex: 1, overflow: "auto", paddingBottom: 100 }}>
        <div style={{ display: "grid", gridTemplateColumns: "48px repeat(7, 1fr)" }}>
          {HOURS.map(hour => (
            <div key={hour} style={{ display: "contents" }}>
              <div style={{
                height: ROW_H, display: "flex", alignItems: "flex-start", justifyContent: "flex-end",
                paddingTop: 2, paddingRight: 10,
              }}>
                <span style={{ fontSize: 10, color: "var(--text-sec)", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
                  {String(hour).padStart(2, "0")}:00
                </span>
              </div>
              {days.map((day, di) => {
                const slotRecords = allRecords.filter(r => {
                  const d = new Date(r.startTime);
                  return sameDay(d, day) && d.getHours() === hour;
                });
                return (
                  <div key={di} style={{
                    height: ROW_H,
                    position: "relative",
                    padding: "1px 3px",
                  }}>
                    {slotRecords.map(r => {
                      const startMin = new Date(r.startTime).getMinutes();
                      const durMin = Math.round(r.actualDuration / 60);
                      const topPx = (startMin / 60) * ROW_H;
                      const hPx = Math.max((durMin / 60) * ROW_H, 28);
                      return (
                        <div key={r.id} style={{
                          position: "absolute",
                          top: topPx + 1, left: 4, right: 4,
                          height: hPx - 2,
                          background: `linear-gradient(135deg, ${r.tagColor}E6, ${r.tagColor}AA)`,
                          borderRadius: 16,
                          padding: "8px 10px",
                          display: "flex", flexDirection: "column", justifyContent: "space-between",
                          overflow: "hidden",
                          backdropFilter: "blur(8px)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          boxShadow: `0 4px 16px ${r.tagColor}40, inset 0 1px 0 rgba(255,255,255,0.25)`,
                          zIndex: 2,
                        }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#FFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.tagName}</span>
                          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>{durMin}m</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
