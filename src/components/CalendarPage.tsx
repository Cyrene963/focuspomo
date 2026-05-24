"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";

const DAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const ROW_H = 56;

type CalendarRecord = ReturnType<typeof useStore.getState>["history"][number];
type LaneRecord = CalendarRecord & { lane: number; laneCount: number };

function layoutLanes(records: CalendarRecord[]): LaneRecord[] {
  const sorted = [...records].sort((a, b) => a.startTime - b.startTime);
  const laneEnds: number[] = [];
  return sorted.map((r) => {
    const start = r.startTime;
    const end = r.startTime + Math.max(r.actualDuration, 60) * 1000;
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = end;
    return { ...r, lane, laneCount: laneEnds.length };
  }).map((r) => ({ ...r, laneCount: laneEnds.length }));
}

function startOfWeek(d: Date) { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); r.setHours(0,0,0,0); return r; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString(); }

export default function CalendarPage() {
  const { history } = useStore();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = addDays(weekStart, 7);

  const allRecords = useMemo(() => {
    const real = history.filter(r => r.startTime >= weekStart.getTime() && r.startTime < weekEnd.getTime());
    return real;
  }, [history, weekStart, weekEnd]);

  const weekLabel = () => {
    const s = weekStart, e = addDays(weekStart, 6);
    return `${s.getMonth() + 1}月${s.getDate()}日 – ${e.getMonth() + 1}月${e.getDate()}日`;
  };

  const ROW_HEIGHT = ROW_H;
  const jumpToday = () => setWeekStart(startOfWeek(new Date()));

  return (
    <div style={{ height: "100%", width: "100%", background: "var(--bg)", display: "flex", flexDirection: "column", transition: "background 0.4s" }}>
      {/* Header */}
      <div style={{ padding: "52px 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="上一周" className="pressable" style={{ padding: 8, minWidth: 44, minHeight: 44 }}>
            <svg width="16" height="16" viewBox="0 0 8 12" fill="none" stroke="var(--text-sec)" strokeWidth="2" strokeLinecap="round"><path d="M6 1L1 6l5 5" /></svg>
          </button>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", minWidth: 160, textAlign: "center" }}>{weekLabel()}</span>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="下一周" className="pressable" style={{ padding: 8, minWidth: 44, minHeight: 44 }}>
            <svg width="16" height="16" viewBox="0 0 8 12" fill="none" stroke="var(--text-sec)" strokeWidth="2" strokeLinecap="round"><path d="M1 1l5 5-5 5" /></svg>
          </button>
          {!sameDay(weekStart, startOfWeek(today)) && (
            <button onClick={jumpToday} className="pressable" style={{
              marginLeft: 4, padding: "8px 12px", borderRadius: 14,
              background: "var(--separator)", color: "var(--text)", fontSize: 12, fontWeight: 700,
            }}>今天</button>
          )}
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
      <div style={{ flex: 1, overflow: "auto", paddingBottom: 100, position: "relative" }}>
        {allRecords.length === 0 && (
          <div style={{
            position: "absolute", inset: "96px 20px auto 68px", zIndex: 3,
            padding: "18px 20px", borderRadius: 22,
            background: "var(--bg-glass)", color: "var(--text-sec)",
            border: "1px solid rgba(0,0,0,0.04)", lineHeight: 1.6,
            boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>还没有专注记录</div>
            <div style={{ fontSize: 13 }}>完成一个番茄后，这里会按时间轴显示真实记录。</div>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "48px repeat(7, 1fr)" }}>
          {HOURS.map(hour => (
            <div key={hour} style={{ display: "contents" }}>
              <div style={{
                height: ROW_HEIGHT, display: "flex", alignItems: "flex-start", justifyContent: "flex-end",
                paddingTop: 2, paddingRight: 10,
              }}>
                <span style={{ fontSize: 10, color: "var(--text-sec)", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
                  {String(hour).padStart(2, "0")}:00
                </span>
              </div>
              {days.map((day, di) => {
                const slotRecords = layoutLanes(allRecords.filter(r => {
                  const d = new Date(r.startTime);
                  return sameDay(d, day) && d.getHours() === hour;
                }));
                return (
                  <div key={di} style={{
                    height: ROW_HEIGHT,
                    position: "relative",
                    padding: "1px 3px",
                  }}>
                    {slotRecords.map(r => {
                      const startMin = new Date(r.startTime).getMinutes();
                      const durMin = Math.round(r.actualDuration / 60);
                      const topPx = (startMin / 60) * ROW_HEIGHT;
                      const hPx = Math.max((durMin / 60) * ROW_HEIGHT, 28);
                      const laneWidth = 100 / Math.max(r.laneCount, 1);
                      return (
                        <div key={r.id} aria-label={`${r.tagName} ${durMin}分钟`} title={`${r.tagName} · ${durMin}分钟`} style={{
                          position: "absolute",
                          top: topPx + 1,
                          left: `calc(${r.lane * laneWidth}% + 4px)`,
                          width: `calc(${laneWidth}% - 8px)`,
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
                          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>{durMin}分</span>
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
