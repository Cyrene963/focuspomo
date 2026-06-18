"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { jsonFetch } from "@/lib/cloudSync";

type AgentKeyState = {
  connected: boolean;
  key: string | null;
  keyInfo: { id: string; label: string; created_at: string; last_used_at: string | null } | null;
  mcp: { endpoint: string; project: string; resources: string[]; actions: string[] };
};

type User = { id: string; email: string; name: string | null };

const cardStyle: React.CSSProperties = { padding: 18, display: "grid", gap: 12 };
const codeStyle: React.CSSProperties = {
  borderRadius: 14,
  background: "rgba(45,38,37,0.06)",
  color: "var(--text)",
  padding: "10px 12px",
  fontSize: 11,
  lineHeight: 1.5,
  overflow: "auto",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

function useSignedInUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const refresh = useCallback(() => {
    jsonFetch<{ user: User | null }>("/api/me")
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null));
  }, []);
  useEffect(() => {
    refresh();
    const onAuth = () => refresh();
    window.addEventListener("focuspomo:auth", onAuth);
    window.addEventListener("focus", onAuth);
    return () => {
      window.removeEventListener("focuspomo:auth", onAuth);
      window.removeEventListener("focus", onAuth);
    };
  }, [refresh]);
  return user;
}

export default function AgentConnectPanel() {
  const user = useSignedInUser();
  const [state, setState] = useState<AgentKeyState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refreshState = useCallback(() => {
    if (!user) return;
    jsonFetch<AgentKeyState>("/api/agent/key")
      .then(data => setState(data))
      .catch(() => setMessage("无法读取 Agent 连接状态"));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refreshState();
  }, [user, refreshState]);

  const instruction = useMemo(() => {
    if (!state) return "";
    const auth = state.key ? `Bearer ${state.key}` : "Bearer <生成后显示一次的 FocusPomo Agent Key>";
    return [
      "You can use FocusPomo as the user's execution system.",
      `Project: ${state.mcp.project}`,
      `Endpoint: ${state.mcp.endpoint}`,
      `Authorization: ${auth}`,
      "Readable resources: tasks, todayTasks, focusRecords, calendar, summary, snapshot.",
      "Writable actions: replace_today, add_task, update_task, delete_task, plan_today.",
      "Use it to inspect the user's todo list, today's planned tasks, focus records, and calendar timeline; only write tasks when the user asks you to plan, schedule, or update FocusPomo.",
    ].join("\n");
  }, [state]);

  if (user === undefined) return null;
  if (!user) return null;

  const generate = async () => {
    setBusy(true);
    setMessage("");
    try {
      const data = await jsonFetch<AgentKeyState>("/api/agent/key", { method: "POST", body: JSON.stringify({ label: "AI Agent" }) });
      setState(data);
      setMessage("已生成新的 Agent Key，只会显示这一次。");
    } catch {
      setMessage("生成失败，请稍后再试。");
    } finally {
      setBusy(false);
    }
  };

  const copyInstruction = async () => {
    try {
      await navigator.clipboard.writeText(instruction);
      setMessage("已复制给 AI Agent 的连接说明。");
    } catch {
      setMessage("复制失败，可以手动选中下面文本。");
    }
  };

  return (
    <div style={cardStyle}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 900, color: "var(--text)" }}>AI Agent / MCP 连接</div>
        <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.55, color: "var(--text-sec)" }}>
          让 Hermes 或其他 Agent 读取你的 todo、今日任务、专注记录和日程，并按你的要求更新任务列表。
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 850, color: "var(--text)" }}>{state?.connected ? "已创建连接 key" : "尚未创建连接 key"}</div>
          <div style={{ fontSize: 11, color: "var(--text-sec)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
        </div>
        <button type="button" disabled={busy} onClick={generate} className="pressable" style={{ borderRadius: 16, padding: "9px 12px", background: "var(--text)", color: "var(--bg)", fontSize: 12, fontWeight: 900, opacity: busy ? 0.55 : 1 }}>
          {state?.connected ? "重新生成" : "一键连接"}
        </button>
      </div>

      {state && (
        <>
          <div style={codeStyle}>{instruction}</div>
          <button type="button" onClick={copyInstruction} className="pressable" style={{ borderRadius: 16, padding: "10px 12px", background: "rgba(85,166,122,0.14)", color: "var(--leaf)", fontSize: 12, fontWeight: 900 }}>
            复制连接说明
          </button>
        </>
      )}

      {message && <div style={{ fontSize: 12, lineHeight: 1.5, color: message.includes("失败") ? "var(--accent)" : "var(--leaf)", fontWeight: 750 }}>{message}</div>}
      <div style={{ fontSize: 11, lineHeight: 1.5, color: "var(--text-sec)" }}>
        安全提示：Agent Key 等同于这个账号的 FocusPomo 读写权限，不要发到公开聊天或 GitHub。重新生成会废弃旧 key。
      </div>
    </div>
  );
}
