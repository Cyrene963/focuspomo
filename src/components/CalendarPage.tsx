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

function ManualAddSheet({ onClose }: { onClose: () => void }) {
  const { tags, selectedTag, addManualRecord } = useStore();
  const now = new Date();
  const [tagId, setTagId] = useState(selectedTag.id);
  const [date, setDate] = useState(() => now.toISOString().slice(0, 10));
  const [time, setTime] = useState(() => `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
  const [minutes, setMinutes] = useState(25);

  const submit = () => {
    const start = new Date(`${date}T${time}:00`).getTime();
    if (!Number.isFinite(start)) return;
    addManualRecord({ tagId, startTime: start, durationSeconds: minutes * 60 });
    onClose();
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%", height: 44, borderRadius: 16, border: "1px solid var(--separator)",
    background: "var(--control-bg)", color: "var(--text)", padding: "0 12px", fontSize: 15,
    fontFamily: "var(--font)", outline: "none",
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(45,38,37,0.22)", backdropFilter: "blur(10px)" }}>
      <section onClick={(e) => e.stopPropagation()} style={{ width: "min(430px, 100%)", borderRadius: "28px 28px 0 0", background: "var(--bg)", boxShadow: "0 -18px 46px rgba(45,38,37,0.18)", padding: "14px 20px max(24px, env(safe-area-inset-bottom))" }}>
        <div style={{ width: 42, height: 5, borderRadius: 3, background: "var(--separator)", margin: "0 auto 18px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text)" }}>补录专注</div>
            <div style={{ fontSize: 12, color: "var(--text-sec)", marginTop: 4 }}>只写入你确认完成的真实专注时间。</div>
          </div>
          <button type="button" onClick={onClose} className="pressable" style={{ width: 36, height: 36, borderRadius: 18, background: "var(--control-bg)", color: "var(--text-sec)", fontSize: 20 }}>×</button>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, color: "var(--text-sec)" }}>标签
            <select value={tagId} onChange={(e) => setTagId(e.target.value)} style={fieldStyle}>
              {tags.map(tag => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
            </select>
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, color: "var(--text-sec)" }}>日期
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={fieldStyle} />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, color: "var(--text-sec)" }}>开始
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={fieldStyle} />
            </label>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderRadius: 18, background: "var(--control-bg)" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 850, color: "var(--text)" }}>时长</div>
              <div style={{ fontSize: 12, color: "var(--text-sec)", marginTop: 3 }}>按 5 分钟调整，最多 12 小时。</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button type="button" className="pressable" onClick={() => setMinutes(v => Math.max(1, v - 5))} style={{ width: 32, height: 32, borderRadius: 16, background: "rgba(224,122,69,0.12)", color: "var(--accent)", fontSize: 20 }}>−</button>
              <span style={{ minWidth: 54, textAlign: "center", fontSize: 15, fontWeight: 900, color: "var(--text)" }}>{minutes}分</span>
              <button type="button" className="pressable" onClick={() => setMinutes(v => Math.min(720, v + 5))} style={{ width: 32, height: 32, borderRadius: 16, background: "rgba(224,122,69,0.12)", color: "var(--accent)", fontSize: 20 }}>+</button>
            </div>
          </div>
          <button type="button" onClick={submit} className="pressable" style={{ marginTop: 4, height: 50, borderRadius: 25, background: "var(--text)", color: "var(--bg)", fontSize: 16, fontWeight: 850 }}>保存真实记录</button>
        </div>
      </section>
    </div>
  );
}

export default function CalendarPage() {
  const { history } = useStore();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [showManualAdd, setShowManualAdd] = useState(false);
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
        <button onClick={() => setShowManualAdd(true)} className="pressable" style={{
          padding: "9px 13px", borderRadius: 16, background: "var(--text)", color: "var(--bg)", fontSize: 12, fontWeight: 850,
        }}>补录</button>
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
      {showManualAdd && <ManualAddSheet onClose={() => setShowManualAdd(false)} />}
    </div>
  );
}
