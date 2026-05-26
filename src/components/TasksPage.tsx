"use client";

import { useMemo, useState } from "react";
import { useStore, type TaskItem, type TaskPriority, type TaskQuadrant } from "@/lib/store";

const QUADRANT_META: Record<TaskQuadrant, { title: string; short: string; desc: string; color: string; rule: string }> = {
  do: { title: "① 先做", short: "重要且紧急", desc: "危机会滚大、今天不做就会付出代价。", rule: "只放 1 件，立刻开一个 25 分钟番茄。", color: "#E8644E" },
  schedule: { title: "② 每天推进", short: "重要不紧急", desc: "真正产生复利：学习、项目、健康、长期能力。", rule: "每天至少 1 件，优先排进今日 Top 3。", color: "#55A67A" },
  delegate: { title: "③ 批量处理", short: "紧急不重要", desc: "别人催、消息、杂事，不该吃掉深度时间。", rule: "能拒绝就拒绝，不能拒绝就压缩到 10 分钟。", color: "#D4A82A" },
  drop: { title: "④ 划掉", short: "不重要不紧急", desc: "短视频式任务、假忙、可做可不做。", rule: "默认不做，保护注意力。", color: "#86868B" },
};

const PRIORITY_LABEL: Record<TaskPriority, string> = { high: "高", medium: "中", low: "低" };

function quadrantOf(t: Pick<TaskItem, "important" | "urgent">): TaskQuadrant {
  if (t.important && t.urgent) return "do";
  if (t.important && !t.urgent) return "schedule";
  if (!t.important && t.urgent) return "delegate";
  return "drop";
}

function priorityFromFlags(important: boolean, urgent: boolean): TaskPriority {
  if (important && urgent) return "high";
  if (important || urgent) return "medium";
  return "low";
}

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeek(d: Date) {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  r.setHours(0, 0, 0, 0);
  return r.getTime();
}

function ProgressRing({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  const deg = Math.round(pct * 360);
  return (
    <div style={{
      width: 62,
      height: 62,
      borderRadius: "50%",
      background: `conic-gradient(var(--accent) ${deg}deg, var(--separator) ${deg}deg)`,
      display: "grid",
      placeItems: "center",
      boxShadow: "0 8px 24px rgba(232,100,78,0.13)",
    }}>
      <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--bg-card)", display: "grid", placeItems: "center", color: "var(--text)", fontSize: 13, fontWeight: 850 }}>
        {Math.round(pct * 100)}%
      </div>
    </div>
  );
}

function TaskRow({ task, compact = false }: { task: TaskItem; compact?: boolean }) {
  const { toggleTask, updateTask, deleteTask, splitTask } = useStore();
  const q = quadrantOf(task);
  const meta = QUADRANT_META[q];
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      padding: compact ? "12px 0" : "14px 0",
      borderBottom: "0.5px solid var(--separator)",
      opacity: task.completed ? 0.52 : 1,
    }}>
      <button
        type="button"
        aria-label={task.completed ? "标记为未完成" : "完成任务"}
        onClick={() => toggleTask(task.id)}
        className="pressable"
        style={{
          marginTop: 1,
          width: 24,
          height: 24,
          borderRadius: "50%",
          border: `2px solid ${task.completed ? "var(--leaf)" : meta.color}`,
          background: task.completed ? "var(--leaf)" : "transparent",
          color: "#fff",
          fontSize: 14,
          fontWeight: 900,
          flexShrink: 0,
        }}
      >
        {task.completed ? "✓" : ""}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <button
          type="button"
          onClick={() => updateTask(task.id, { plannedToday: !task.plannedToday })}
          style={{
            textAlign: "left",
            color: "var(--text)",
            fontSize: compact ? 15 : 16,
            fontWeight: task.plannedToday ? 850 : 700,
            lineHeight: 1.35,
            textDecoration: task.completed ? "line-through" : "none",
            width: "100%",
          }}
        >
          {task.plannedToday && !task.completed ? "★ " : ""}{task.title}
        </button>
        {task.notes && <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-sec)", lineHeight: 1.45 }}>{task.notes}</div>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: meta.color, background: `${meta.color}18`, borderRadius: 999, padding: "4px 8px" }}>{meta.short}</span>
          <span style={{ fontSize: 11, fontWeight: 750, color: "var(--text-sec)", background: "var(--control-bg)", borderRadius: 999, padding: "4px 8px" }}>{PRIORITY_LABEL[task.priority]}优先级</span>
          <span style={{ fontSize: 11, fontWeight: 750, color: "var(--text-sec)", background: "var(--control-bg)", borderRadius: 999, padding: "4px 8px" }}>{task.estimatedPomodoros}🍅</span>
        </div>
      </div>
      {!compact && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
          <button type="button" className="pressable" onClick={() => splitTask(task.id)} aria-label="尝试拆解任务" title="按逗号/顿号拆成小任务" style={{ fontSize: 15, padding: 6, color: "var(--text-sec)" }}>✦</button>
          <button type="button" className="pressable" onClick={() => deleteTask(task.id)} aria-label="删除任务" style={{ fontSize: 17, padding: 6, color: "var(--text-sec)" }}>×</button>
        </div>
      )}
    </div>
  );
}

function NewTaskForm() {
  const addTask = useStore(s => s.addTask);
  const smartPlanToday = useStore(s => s.smartPlanToday);
  const [title, setTitle] = useState("");
  const [important, setImportant] = useState(true);
  const [urgent, setUrgent] = useState(false);
  const [estimated, setEstimated] = useState(1);

  const submit = () => {
    const v = title.trim();
    if (!v) return;
    addTask({ title: v, priority: priorityFromFlags(important, urgent), important, urgent, estimatedPomodoros: estimated });
    setTitle("");
    setImportant(true);
    setUrgent(false);
    setEstimated(1);
  };

  return (
    <div style={{
      margin: "0 16px 18px",
      borderRadius: 26,
      padding: 16,
      background: "var(--bg-glass)",
      boxShadow: "var(--shadow)",
      border: "1px solid rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="写下一个真正要推进的事"
          aria-label="新任务"
          style={{
            flex: 1,
            minWidth: 0,
            height: 42,
            border: "none",
            outline: "none",
            borderRadius: 18,
            background: "var(--control-bg)",
            color: "var(--text)",
            padding: "0 14px",
            fontSize: 15,
            fontWeight: 650,
          }}
        />
        <button type="button" onClick={submit} className="pressable" style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--text)", color: "var(--bg)", fontSize: 24, fontWeight: 700 }}>+</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginTop: 12, alignItems: "center" }}>
        <button type="button" onClick={() => setImportant(v => !v)} className="pressable" style={{ borderRadius: 16, padding: "9px 10px", background: important ? "rgba(232,100,78,0.14)" : "var(--control-bg)", color: important ? "var(--accent)" : "var(--text-sec)", fontSize: 13, fontWeight: 800 }}>重要</button>
        <button type="button" onClick={() => setUrgent(v => !v)} className="pressable" style={{ borderRadius: 16, padding: "9px 10px", background: urgent ? "rgba(212,168,42,0.18)" : "var(--control-bg)", color: urgent ? "#B98500" : "var(--text-sec)", fontSize: 13, fontWeight: 800 }}>紧急</button>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-sec)", fontSize: 13, fontWeight: 800 }}>
          <button type="button" className="pressable" onClick={() => setEstimated(v => Math.max(1, v - 1))} style={{ width: 28, height: 28, borderRadius: 14, background: "var(--control-bg)", color: "var(--text)" }}>−</button>
          {estimated}🍅
          <button type="button" className="pressable" onClick={() => setEstimated(v => Math.min(8, v + 1))} style={{ width: 28, height: 28, borderRadius: 14, background: "var(--control-bg)", color: "var(--text)" }}>+</button>
        </div>
      </div>
      <button type="button" onClick={smartPlanToday} className="pressable" style={{ marginTop: 12, width: "100%", borderRadius: 18, padding: "11px 12px", background: "rgba(85,166,122,0.13)", color: "var(--leaf)", fontSize: 13, fontWeight: 850 }}>
        智能选今天三件事
      </button>
    </div>
  );
}

export default function TasksPage() {
  const { tasks, smartPlanToday, clearCompletedTasks } = useStore();
  const active = tasks.filter(t => !t.completed);
  const completed = tasks.filter(t => t.completed);
  const today = active.filter(t => t.plannedToday).slice(0, 3);
  const doneToday = tasks.filter(t => t.completedAt && t.completedAt >= todayStart()).length;
  const weekDone = tasks.filter(t => t.completedAt && t.completedAt >= startOfWeek(new Date())).length;
  const progress = today.length ? today.filter(t => t.completed).length / today.length : Math.min(1, doneToday / 3);

  const matrixOrder: TaskQuadrant[] = ["do", "schedule", "delegate", "drop"];
  const quadrants = useMemo(() => {
    const buckets: Record<TaskQuadrant, TaskItem[]> = { do: [], schedule: [], delegate: [], drop: [] };
    active.forEach(t => buckets[quadrantOf(t)].push(t));
    (Object.keys(buckets) as TaskQuadrant[]).forEach(q => {
      buckets[q].sort((a, b) => Number(b.plannedToday) - Number(a.plannedToday) || b.estimatedPomodoros - a.estimatedPomodoros || b.updatedAt - a.updatedAt);
    });
    return buckets;
  }, [active]);

  return (
    <div style={{ height: "100%", width: "100%", background: "var(--bg)", overflow: "auto", padding: "52px 0 124px", transition: "background 0.4s" }}>
      <div style={{ padding: "0 24px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div>
          <div style={{ fontSize: "clamp(28px, 6vw, 36px)", fontWeight: 900, color: "var(--text)", letterSpacing: "-0.045em" }}>今天三件事</div>
          <div style={{ marginTop: 6, fontSize: 13, color: "var(--text-sec)", lineHeight: 1.5 }}>顺序不是“谁急做谁”：先救火，再投资长期，杂事限时，垃圾划掉。</div>
        </div>
        <ProgressRing value={progress} />
      </div>

      <NewTaskForm />

      <section style={{ margin: "0 16px 18px", borderRadius: 26, padding: "14px 16px", background: "rgba(45,38,37,0.045)", border: "1px solid rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: "var(--text)", marginBottom: 8 }}>怎么排优先级？</div>
        {[
          ["1", "重要且紧急", "今天不做会爆炸：先用一个番茄止血。"],
          ["2", "重要不紧急", "最值得每天推进：能力、项目、健康，产生复利。"],
          ["3", "紧急不重要", "设时间盒批量清掉，不让它抢走深度时间。"],
          ["4", "不重要不紧急", "默认删除，尤其是会把你滑向长视频的事。"],
        ].map(([n, title, desc]) => (
          <div key={n} style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 8, padding: "5px 0", alignItems: "start" }}>
            <span style={{ width: 22, height: 22, borderRadius: 11, display: "grid", placeItems: "center", background: "var(--text)", color: "var(--bg)", fontSize: 12, fontWeight: 900 }}>{n}</span>
            <div><span style={{ fontSize: 13, fontWeight: 850, color: "var(--text)" }}>{title}</span><span style={{ fontSize: 12, color: "var(--text-sec)", lineHeight: 1.45 }}> — {desc}</span></div>
          </div>
        ))}
      </section>

      <section style={{ margin: "0 16px 18px", borderRadius: 26, padding: "16px 18px", background: "linear-gradient(135deg, rgba(232,100,78,0.12), rgba(85,166,122,0.10))", border: "1px solid rgba(232,100,78,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "var(--text)" }}>今日 Top 3</div>
            <div style={{ fontSize: 12, color: "var(--text-sec)", marginTop: 3 }}>每天不要塞满，只留下最能复利的三件。</div>
          </div>
          <button type="button" onClick={smartPlanToday} className="pressable" style={{ borderRadius: 16, padding: "8px 10px", color: "var(--accent)", background: "rgba(255,255,255,0.46)", fontSize: 12, fontWeight: 900 }}>重排</button>
        </div>
        {today.length === 0 ? (
          <div style={{ color: "var(--text-sec)", fontSize: 13, lineHeight: 1.65, padding: "12px 0" }}>还没选今日三件事。先写下任务，再点“智能选今天三件事”。</div>
        ) : today.map(t => <TaskRow key={t.id} task={t} compact />)}
      </section>

      <section style={{ margin: "0 16px 18px", borderRadius: 26, padding: "14px 16px", background: "var(--bg-glass)", boxShadow: "var(--shadow)", border: "1px solid rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div><div style={{ fontSize: 22, fontWeight: 900, color: "var(--accent)" }}>{active.length}</div><div style={{ fontSize: 12, color: "var(--text-sec)", fontWeight: 700 }}>未完成</div></div>
          <div><div style={{ fontSize: 22, fontWeight: 900, color: "var(--leaf)" }}>{doneToday}</div><div style={{ fontSize: 12, color: "var(--text-sec)", fontWeight: 700 }}>今日完成</div></div>
          <div><div style={{ fontSize: 22, fontWeight: 900, color: "var(--text)" }}>{weekDone}</div><div style={{ fontSize: 12, color: "var(--text-sec)", fontWeight: 700 }}>本周完成</div></div>
        </div>
      </section>

      {matrixOrder.map(q => {
        const meta = QUADRANT_META[q];
        const list = quadrants[q];
        return (
          <section key={q} style={{ margin: "0 16px 16px", borderRadius: 26, padding: "16px 18px 4px", background: "var(--bg-glass)", boxShadow: "var(--shadow)", border: "1px solid rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, paddingBottom: 4 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 900, color: meta.color }}>{meta.title}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text)", marginTop: 2 }}>{meta.short}</div>
                <div style={{ fontSize: 12, color: "var(--text-sec)", marginTop: 3, lineHeight: 1.45 }}>{meta.desc}</div>
                <div style={{ fontSize: 11, color: meta.color, marginTop: 5, fontWeight: 850, lineHeight: 1.45 }}>{meta.rule}</div>
              </div>
              <span style={{ minWidth: 28, height: 28, borderRadius: 14, background: `${meta.color}18`, color: meta.color, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 900 }}>{list.length}</span>
            </div>
            {list.length === 0 ? <div style={{ padding: "14px 0 18px", color: "var(--text-sec)", fontSize: 13 }}>空的，很好。</div> : list.map(t => <TaskRow key={t.id} task={t} />)}
          </section>
        );
      })}

      {completed.length > 0 && (
        <section style={{ margin: "0 16px 16px", borderRadius: 26, padding: "16px 18px", background: "var(--bg-glass)", boxShadow: "var(--shadow)", border: "1px solid rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: "var(--text)" }}>已完成</div>
            <button type="button" onClick={clearCompletedTasks} className="pressable" style={{ color: "var(--text-sec)", fontSize: 12, fontWeight: 800 }}>清理</button>
          </div>
          {completed.slice(0, 8).map(t => <TaskRow key={t.id} task={t} compact />)}
        </section>
      )}
    </div>
  );
}
