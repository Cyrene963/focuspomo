"use client";

import { useMemo } from "react";
import { useStore, type TaskItem } from "@/lib/store";
import { tomatoVisualSize, tomatoWallGridStyle } from "@/lib/tomatoVisuals";

function formatMinutes(totalMin: number) {
  if (totalMin < 60) return `${totalMin}分`;
  return `${Math.floor(totalMin / 60)}小时 ${totalMin % 60}分`;
}

function todayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function quadrantLabel(task: TaskItem) {
  if (task.important && task.urgent) return "重要且紧急";
  if (task.important) return "重要不紧急";
  if (task.urgent) return "紧急不重要";
  return "可删减";
}

export default function SummaryPage() {
  const { history, tasks, setPage, smartPlanToday, toggleTask } = useStore();

  const stats = useMemo(() => {
    const now = new Date();
    const monthRecords = history.filter(r => {
      const d = new Date(r.startTime);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const today = todayKey(Date.now());
    const todayRecords = history.filter(r => todayKey(r.startTime) === today);
    const todayCompleted = todayRecords.filter(r => r.completed);
    const completed = monthRecords.filter(r => r.completed);
    const totalMin = Math.round(completed.reduce((s, r) => s + r.actualDuration, 0) / 60);
    const todayMin = Math.round(todayRecords.reduce((s, r) => s + r.actualDuration, 0) / 60);

    const days = new Set(history.filter(r => r.completed).map(r => new Date(r.startTime).toDateString()));
    let streak = 0;
    const d = new Date();
    while (days.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }

    return { totalMin, todayMin, completedCount: completed.length, todayCount: todayCompleted.length, streak, monthRecords };
  }, [history]);

  const topTasks = useMemo(() => {
    const score = (t: TaskItem) =>
      (t.plannedToday ? 100 : 0) + (t.important ? 30 : 0) + (t.urgent ? 18 : 0) +
      ({ high: 12, medium: 6, low: 0 } as Record<TaskItem["priority"], number>)[t.priority] -
      Math.max(0, t.estimatedPomodoros - 2) * 2;
    return [...tasks].filter(t => !t.completed).sort((a, b) => score(b) - score(a)).slice(0, 3);
  }, [tasks]);

  const completedToday = useMemo(() => {
    const today = todayKey(Date.now());
    return tasks.filter(t => t.completedAt && todayKey(t.completedAt) === today).length;
  }, [tasks]);

  const now = new Date();
  const monthlyCompleted = useMemo(() => {
    return stats.monthRecords
      .filter(r => r.completed)
      .sort((a, b) => a.startTime - b.startTime);
  }, [stats.monthRecords]);
  const hasProgress = stats.todayCount > 0 || completedToday > 0;

  const card: React.CSSProperties = {
    background: "var(--bg-glass)",
    borderRadius: 28,
    padding: 22,
    boxShadow: "var(--shadow)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
  };

  return (
    <div style={{
      height: "100%", minHeight: 0, width: "100%", background: "var(--bg)",
      overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch", touchAction: "pan-y",
      padding: "max(18px, env(safe-area-inset-top)) 16px max(124px, calc(env(safe-area-inset-bottom) + 96px))",
      transition: "background 0.4s",
    }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div aria-hidden="true" style={{ width: 46, height: 5, borderRadius: 999, background: "rgba(45,38,37,0.18)", margin: "0 auto 18px" }} />

        <section style={{
          ...card,
          padding: 24,
          borderRadius: 34,
          background: "linear-gradient(145deg, rgba(255,255,255,0.86), rgba(255,248,240,0.7))",
          position: "relative",
          overflow: "hidden",
          marginBottom: 16,
        }}>
          <div aria-hidden="true" style={{ position: "absolute", right: -36, top: -28, width: 138, height: 138, borderRadius: "50%", background: "rgba(232,100,78,0.12)" }} />
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 13, color: "var(--text-sec)", fontWeight: 700, marginBottom: 4 }}>今日复盘</div>
                <h1 style={{ margin: 0, fontSize: "clamp(28px, 7vw, 38px)", lineHeight: 1.08, color: "var(--text)", letterSpacing: -1 }}>
                  {hasProgress ? "今天已经动起来了" : "先做最重要的一件事"}
                </h1>
              </div>
              <button type="button" onClick={() => setPage("timer")} className="pressable" style={{
                flex: "0 0 auto", borderRadius: 22, padding: "12px 15px", background: "var(--text)", color: "var(--bg)",
                fontWeight: 800, fontSize: 13, boxShadow: "0 12px 28px rgba(45,38,37,0.18)",
              }}>回到计时</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr 1fr", gap: 10 }}>
              <div style={{ padding: 16, borderRadius: 24, background: "rgba(232,100,78,0.12)" }}>
                <div style={{ fontSize: 12, color: "var(--text-sec)", fontWeight: 700 }}>今日专注</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "var(--accent)", marginTop: 4 }}>{formatMinutes(stats.todayMin)}</div>
              </div>
              <div style={{ padding: 16, borderRadius: 24, background: "rgba(255,255,255,0.68)", textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: "var(--text)" }}>{stats.todayCount}</div>
                <div style={{ fontSize: 11, color: "var(--text-sec)", fontWeight: 700 }}>番茄</div>
              </div>
              <div style={{ padding: 16, borderRadius: 24, background: "rgba(255,255,255,0.68)", textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: "var(--text)" }}>{stats.streak}</div>
                <div style={{ fontSize: 11, color: "var(--text-sec)", fontWeight: 700 }}>连续天</div>
              </div>
            </div>
          </div>
        </section>

        <section style={{ ...card, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "var(--text)" }}>今天只抓三件事</div>
              <div style={{ fontSize: 12, color: "var(--text-sec)", marginTop: 3 }}>按重要性、紧急度、优先级和番茄数排序</div>
            </div>
            <button type="button" onClick={smartPlanToday} className="pressable" style={{
              borderRadius: 18, background: "var(--accent)", color: "white", fontSize: 12, fontWeight: 900, padding: "10px 12px",
            }}>按优先级选3件</button>
          </div>
          {topTasks.length === 0 ? (
            <div style={{ borderRadius: 22, padding: 18, background: "var(--separator)", color: "var(--text-sec)", fontSize: 13, lineHeight: 1.6 }}>
              还没有待办。去任务页写下脑子里的事情，再按优先级把今天真正要做的留下。
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {topTasks.map((task, index) => (
                <button key={task.id} type="button" onClick={() => toggleTask(task.id)} className="pressable" style={{
                  display: "grid", gridTemplateColumns: "34px 1fr auto", gap: 12, alignItems: "center", textAlign: "left",
                  borderRadius: 22, padding: 14, background: task.plannedToday ? "rgba(232,100,78,0.1)" : "rgba(255,255,255,0.62)",
                }}>
                  <span style={{ width: 34, height: 34, borderRadius: 15, background: index === 0 ? "var(--accent)" : "var(--separator)", color: index === 0 ? "white" : "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>{index + 1}</span>
                  <span>
                    <span style={{ display: "block", color: "var(--text)", fontSize: 14, fontWeight: 850, lineHeight: 1.35 }}>{task.title}</span>
                    <span style={{ display: "block", color: "var(--text-sec)", fontSize: 11, marginTop: 4 }}>{quadrantLabel(task)} · {task.estimatedPomodoros} 个番茄</span>
                  </span>
                  <span style={{ color: "var(--accent)", fontSize: 18 }}>○</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section style={{ ...card, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "var(--text)" }}>{now.getFullYear()}年{now.getMonth() + 1}月复利</div>
              <div style={{ fontSize: 12, color: "var(--text-sec)", marginTop: 3 }}>{formatMinutes(stats.totalMin)} · {stats.completedCount} 个番茄</div>
            </div>
            <button type="button" onClick={() => setPage("stats")} className="pressable" style={{ fontSize: 13, color: "var(--accent)", fontWeight: 800, background: "none", padding: 0 }}>
              查看统计 ›
            </button>
          </div>
          <div style={tomatoWallGridStyle("summary")}>
            {monthlyCompleted.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "28px 12px", color: "var(--text-sec)", fontSize: 13, lineHeight: 1.7 }}>
                本月还没有番茄。先开始一个 10 分钟小番茄，让这张图出现第一颗。
              </div>
            ) : monthlyCompleted.slice(-42).map(r => {
              const minutes = Math.round(r.actualDuration / 60);
              const size = tomatoVisualSize(r.actualDuration, "summary");
              return (
                <div key={r.id} title={`${r.tagName} ${minutes}分`} style={{ height: 68, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                  <img
                    src={"/tomato-red.svg"}
                    alt="完成的番茄"
                    style={{
                      width: size,
                      height: "auto",
                      aspectRatio: "107 / 125",
                      filter: `drop-shadow(0 8px 18px ${(r.tagColor || "#E8644E")}33)`,
                    }}
                  />
                  <span style={{ fontSize: 9, color: "var(--text-sec)", lineHeight: 1 }}>{minutes}分</span>
                </div>
              );
            })}
          </div>
        </section>

        <div style={{ textAlign: "center", color: "var(--text-sec)", fontSize: 12, lineHeight: 1.6, padding: "2px 12px 0" }}>
          下滑回计时。这里不是多一个页面，而是每天防止滑向长视频的“行动刹车”。
        </div>
      </div>
    </div>
  );
}
