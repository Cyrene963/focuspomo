"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";

export default function SummaryPage() {
  const { history } = useStore();

  const stats = useMemo(() => {
    const now = new Date();
    const monthRecords = history.filter(r => {
      const d = new Date(r.startTime);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const completed = monthRecords.filter(r => r.completed);
    const totalMin = Math.round(completed.reduce((s, r) => s + r.actualDuration, 0) / 60);

    // Streak
    const days = new Set(history.filter(r => r.completed).map(r => new Date(r.startTime).toDateString()));
    let streak = 0;
    const d = new Date();
    while (days.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }

    return { totalMin, completedCount: completed.length, streak, monthRecords };
  }, [history]);

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const now = new Date();

  return (
    <div style={{
      height: "100%", width: "100%", background: "var(--bg)",
      overflow: "auto", padding: "52px 20px 120px",
      transition: "background 0.4s",
    }}>
      {/* Welcome */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: "clamp(24px, 5vw, 32px)", fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
          Welcome ^ ^
        </div>
        <div style={{ fontSize: 13, color: "var(--text-sec)", fontStyle: "italic", lineHeight: 1.5 }}>
          &ldquo;What I do today is important because I am exchanging a day of my life for it.&rdquo;
        </div>
      </div>

      {/* Month title + tomato count */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontSize: "clamp(20px, 4vw, 26px)", fontWeight: 700, color: "var(--text)" }}>
          {now.getFullYear()}年{now.getMonth() + 1}月
        </span>
        <span style={{ fontSize: "clamp(18px, 3.5vw, 24px)", fontWeight: 600, color: "var(--text)" }}>
          {stats.completedCount} 🍅
        </span>
      </div>

      {/* 3 stat cards — no background, just text */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, marginBottom: 28 }}>
        {[
          { value: `${stats.totalMin}`, label: "min focused" },
          { value: `${stats.completedCount}`, label: "completed" },
          { value: `${stats.streak}`, label: "day streak" },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "clamp(26px, 6vw, 36px)", fontWeight: 700, color: "var(--text)" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "var(--text-sec)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tomato grid header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>本月番茄</span>
        <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 500 }}>查看统计 ›</span>
      </div>

      {/* Tomato grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10, justifyItems: "center" }}>
        {stats.monthRecords.filter(r => r.completed).length === 0 ? (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 40, color: "var(--text-sec)", fontSize: 13 }}>
            No tomatoes this month yet
          </div>
        ) : (
          stats.monthRecords.filter(r => r.completed).map(r => (
            <div key={r.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: "clamp(36px, 8vw, 48px)",
                height: "clamp(36px, 8vw, 48px)",
                borderRadius: "50%",
                background: r.tagColor || "var(--accent)",
                position: "relative",
              }}>
                {/* Leaf */}
                <div style={{
                  position: "absolute", top: -3, left: "50%", transform: "translateX(-50%)",
                  width: 10, height: 7, borderRadius: "50% 50% 0 0", background: "var(--leaf)",
                }} />
                {/* Eyes */}
                <div style={{
                  position: "absolute", top: "38%", left: "30%", width: 3, height: 3,
                  borderRadius: "50%", background: "rgba(0,0,0,0.4)",
                }} />
                <div style={{
                  position: "absolute", top: "38%", right: "30%", width: 3, height: 3,
                  borderRadius: "50%", background: "rgba(0,0,0,0.4)",
                }} />
                {/* Smile */}
                <div style={{
                  position: "absolute", top: "55%", left: "50%", transform: "translateX(-50%)",
                  width: "40%", height: "20%", borderBottom: "1.5px solid rgba(0,0,0,0.3)",
                  borderRadius: "0 0 50% 50%",
                }} />
              </div>
              <span style={{ fontSize: 10, color: "var(--text-sec)" }}>
                {Math.round(r.actualDuration / 60)}min
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
