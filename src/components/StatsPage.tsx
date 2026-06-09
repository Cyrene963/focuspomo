"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { tomatoVisualSize, tomatoWallGridStyle } from "@/lib/tomatoVisuals";

const PERIODS = ["week", "month", "year"] as const;
const PERIOD_LABELS = { week: "本周", month: "本月", year: "今年" } as const;

type BarBucket = { label: string; mins: number; color: string; aria: string };

function startOfWeek(d: Date) {
  const r = new Date(d);
  const day = r.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  r.setDate(r.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}

function periodStart(period: typeof PERIODS[number], now = new Date()) {
  if (period === "week") return startOfWeek(now);
  if (period === "month") return startOfMonth(now);
  return startOfYear(now);
}

function bucketRecords(records: ReturnType<typeof useStore.getState>["history"], period: typeof PERIODS[number]): BarBucket[] {
  const now = new Date();
  if (period === "week") {
    const labels = ["一", "二", "三", "四", "五", "六", "日"];
    return labels.map((label, i) => {
      const dayIdx = (i + 1) % 7;
      const mins = Math.round(records.filter(r => new Date(r.startTime).getDay() === dayIdx).reduce((s, r) => s + r.actualDuration, 0) / 60);
      return { label, mins, color: "var(--accent)", aria: `星期${label} ${mins}分钟` };
    });
  }
  if (period === "month") {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const bucketSize = Math.ceil(daysInMonth / 7);
    return Array.from({ length: 7 }, (_, i) => {
      const start = i * bucketSize + 1;
      const end = Math.min(daysInMonth, start + bucketSize - 1);
      if (start > daysInMonth) return null;
      const mins = Math.round(records.filter(r => {
        const d = new Date(r.startTime).getDate();
        return d >= start && d <= end;
      }).reduce((s, r) => s + r.actualDuration, 0) / 60);
      const label = `${start}-${end}`;
      return { label, mins, color: "var(--accent)", aria: `${label}日 ${mins}分钟` };
    }).filter(Boolean) as BarBucket[];
  }
  return Array.from({ length: 12 }, (_, i) => {
    const mins = Math.round(records.filter(r => new Date(r.startTime).getMonth() === i).reduce((s, r) => s + r.actualDuration, 0) / 60);
    return { label: `${i + 1}月`, mins, color: "var(--accent)", aria: `${i + 1}月 ${mins}分钟` };
  });
}

export default function StatsPage() {
  const { history } = useStore();
  const [period, setPeriod] = useState<typeof PERIODS[number]>("week");

  const filtered = useMemo(() => {
    const start = periodStart(period);
    return history.filter(r => new Date(r.startTime) >= start);
  }, [history, period]);

  const totalMin = Math.round(filtered.reduce((s, r) => s + r.actualDuration, 0) / 60);
  const completed = filtered.filter(r => r.completed).length;
  const abandoned = filtered.filter(r => !r.completed).length;

  const barBuckets = useMemo(() => bucketRecords(filtered, period), [filtered, period]);
  const maxBar = Math.max(...barBuckets.map(b => b.mins), 60);

  const tagStats = useMemo(() => {
    const m = new Map<string, { name: string; color: string; mins: number }>();
    filtered.forEach(r => { const e = m.get(r.tagName); if (e) e.mins += r.actualDuration / 60; else m.set(r.tagName, { name: r.tagName, color: r.tagColor, mins: r.actualDuration / 60 }); });
    return [...m.values()].sort((a, b) => b.mins - a.mins);
  }, [filtered]);

  const visibleTomatoes = useMemo(() => {
    return [...filtered]
      .sort((a, b) => a.startTime - b.startTime)
      .slice(-35);
  }, [filtered]);

  const streakInfo = useMemo(() => {
    const days = new Set(history.filter(r => r.completed).map(r => new Date(r.startTime).toDateString()));
    let current = 0; const d = new Date();
    while (days.has(d.toDateString())) { current++; d.setDate(d.getDate() - 1); }
    const sorted = [...days].map(x => new Date(x).getTime()).sort((a, b) => a - b);
    let longest = 0, run = 0, prev = 0;
    for (const t of sorted) {
      run = prev && Math.round((t - prev) / 86400000) === 1 ? run + 1 : 1;
      longest = Math.max(longest, run);
      prev = t;
    }
    const latest = sorted.length ? new Date(sorted[sorted.length - 1]).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }) : "无";
    return { current, longest, latest };
  }, [history]);

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-glass)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    borderRadius: 24,
    padding: 28,
    boxShadow: "var(--shadow)",
    transition: "background 0.4s, box-shadow 0.4s",
  };

  return (
    <div style={{ height: "100%", width: "100%", background: "var(--bg)", overflow: "auto", padding: "52px 16px 120px", transition: "background 0.4s" }}>
      {/* Header */}
      <div style={{ padding: "0 8px 24px" }}>
        <span style={{ fontSize: "clamp(24px, 5vw, 32px)", fontWeight: 800, color: "var(--text)" }}>统计</span>
      </div>

      {/* Period tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, padding: "0 4px" }}>
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)} className="pressable" style={{
            padding: "8px 22px", borderRadius: 22,
            background: period === p ? "var(--text)" : "var(--separator)",
            color: period === p ? "var(--bg)" : "var(--text-sec)",
            fontSize: 13, fontWeight: 600, transition: "all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          }}>
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* FOCUS TREND */}
        <div style={cardStyle}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-sec)", marginBottom: 6, letterSpacing: 0.5 }}>专注趋势</div>
          <div style={{ fontSize: "clamp(32px, 7vw, 44px)", fontWeight: 800, color: "var(--accent)", marginBottom: 4 }}>{Math.floor(totalMin/60)}小时 {totalMin%60}分</div>
          <div style={{ fontSize: 12, color: "var(--text-sec)", marginBottom: 28 }}>{PERIOD_LABELS[period]}</div>
          {/* Bar chart */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
            {barBuckets.map((bar, i) => (
              <div key={`${period}-${bar.label}`} aria-label={bar.aria} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                {bar.mins > 0 && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", marginBottom: -4 }}>
                    {bar.mins >= 60 ? `${Math.floor(bar.mins/60)}h${bar.mins%60 > 0 ? bar.mins%60 : ''}` : `${bar.mins}分`}
                  </div>
                )}
                <div style={{
                  width: "100%", maxWidth: period === "year" ? 22 : 36,
                  height: `${Math.max((bar.mins / maxBar) * 100, bar.mins > 0 ? 6 : 3)}px`,
                  background: bar.mins > 0 ? bar.color : "var(--separator)",
                  borderRadius: 999,
                  transition: "height 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                  boxShadow: bar.mins > 0 ? "0 4px 12px rgba(232,100,78,0.2)" : "none",
                  opacity: bar.mins > 0 ? 1 : 0.3,
                }} />
                <span style={{ fontSize: period === "year" ? 9 : 10, color: "var(--text-sec)", fontWeight: 600, writingMode: period === "year" ? "vertical-rl" : "horizontal-tb" }}>{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* POMODORO DETAILS */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-sec)", letterSpacing: 0.5 }}>完成番茄</div>
              <div style={{ fontSize: "clamp(36px, 8vw, 52px)", fontWeight: 800, color: "var(--accent)", marginTop: 4 }}>{completed}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-sec)", letterSpacing: 0.5 }}>中断</div>
              <div style={{ fontSize: "clamp(24px, 5vw, 36px)", fontWeight: 700, color: "var(--text-sec)", marginTop: 4 }}>{abandoned}</div>
            </div>
          </div>
          {/* Tomato grid */}
          <div style={tomatoWallGridStyle("stats")}>
            {visibleTomatoes.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 32, color: "var(--text-sec)", fontSize: 13, lineHeight: 1.6 }}>{PERIOD_LABELS[period]}还没有番茄。完成会收获红番茄，中断也会留下黄色番茄。</div>
            ) : visibleTomatoes.map(r => {
              const size = tomatoVisualSize(r.actualDuration, "stats");
              const minutes = Math.round(r.actualDuration / 60);
              const tomatoKind = r.completed ? "完成的红番茄" : "中断的黄番茄";
              return (
                <div
                  key={r.id}
                  title={`${tomatoKind} · ${r.tagName} ${minutes}分`}
                  aria-label={`${tomatoKind}，${minutes}分钟`}
                  style={{
                    height: 54,
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={r.completed ? "/tomato-red.svg" : "/tomato-yellow.svg"}
                    alt={tomatoKind}
                    style={{
                      width: size,
                      height: "auto",
                      aspectRatio: "107 / 125",
                      filter: "drop-shadow(0 2px 6px rgba(232,100,78,0.15))",
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* PERIOD SUMMARY */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-sec)", letterSpacing: 0.5, marginBottom: 8 }}>{PERIOD_LABELS[period]}番茄</div>
            <div style={{ fontSize: "clamp(32px, 7vw, 44px)", fontWeight: 800, color: "var(--accent)" }}>{completed}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-sec)", letterSpacing: 0.5, marginBottom: 8 }}>{PERIOD_LABELS[period]}小时</div>
            <div style={{ fontSize: "clamp(32px, 7vw, 44px)", fontWeight: 800, color: "var(--accent)" }}>{Math.round(filtered.reduce((s, r) => s + r.actualDuration, 0) / 3600)}小时</div>
          </div>
        </div>

        {/* STREAK */}
        <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-sec)", letterSpacing: 0.5, marginBottom: 8 }}>连续专注</div>
            <div style={{ fontSize: "clamp(28px, 6vw, 40px)", fontWeight: 800, color: "var(--text)" }}>{streakInfo.current} 天 🔥</div>
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-sec)", lineHeight: 1.45 }}>最长 {streakInfo.longest} 天 · 最近活跃 {streakInfo.latest}</div>
          </div>
          <div style={{
            width: 56, height: 56, borderRadius: 20,
            background: "var(--accent-light)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
          }}>🔥</div>
        </div>

        {/* TAG DISTRIBUTION */}
        <div style={cardStyle}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 24 }}>按标签</div>
          {tagStats.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-sec)", fontSize: 13, padding: 28 }}>还没有数据</div>
          ) : tagStats.map((tag, i) => {
            const pct = totalMin > 0 ? (tag.mins / totalMin) * 100 : 0;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: tag.color, boxShadow: `0 2px 6px ${tag.color}44` }} />
                <span style={{ fontSize: 14, color: "var(--text)", width: 80, fontWeight: 500 }}>{tag.name}</span>
                <div style={{ flex: 1, height: 8, background: "var(--separator)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: tag.color, borderRadius: 4, transition: "width 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }} />
                </div>
                <span style={{ fontSize: 12, color: "var(--text-sec)", width: 44, textAlign: "right" }}>{Math.round(tag.mins)}分</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
