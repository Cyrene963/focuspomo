"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore, type PomodoroRecord } from "@/lib/store";
import { applySnapshot, jsonFetch, readSnapshot, type Snapshot } from "@/lib/cloudSync";
import { openExternal } from "@/lib/nativeBridge";

type User = { id: string; email: string; name: string | null; picture: string | null; calendarSyncEnabled: boolean };

type CloudState = {
  user: User | null;
  loading: boolean;
  busy: boolean;
  message: string;
  calendarEnabled: boolean;
};

type SyncStatus = "ready" | "restoring" | "uploading" | "synced" | "offline";

function statusText(status: SyncStatus) {
  switch (status) {
    case "restoring": return "正在从云端恢复…";
    case "uploading": return "正在自动同步…";
    case "synced": return "已自动同步";
    case "offline": return "离线，稍后自动重试";
    default: return "自动同步已开启";
  }
}

export default function CloudSyncPanel() {
  const history = useStore(s => s.history);
  const [state, setState] = useState<CloudState>({ user: null, loading: true, busy: false, message: "", calendarEnabled: false });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("ready");

  useEffect(() => {
    let alive = true;
    jsonFetch<{ user: User | null }>("/api/me")
      .then(({ user }) => {
        if (!alive) return;
        setState(s => ({ ...s, user, loading: false, calendarEnabled: Boolean(user?.calendarSyncEnabled) }));
      })
      .catch(() => alive && setState(s => ({ ...s, loading: false, message: "无法读取登录状态" })));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onSync = (event: Event) => {
      const status = (event as CustomEvent<{ status?: SyncStatus }>).detail?.status;
      if (status) setSyncStatus(status);
    };
    window.addEventListener("focuspomo:cloud-sync", onSync);
    return () => window.removeEventListener("focuspomo:cloud-sync", onSync);
  }, []);

  const completedRecords = useMemo(() => history.filter(r => r.completed && r.actualDuration >= 60), [history]);

  const signOut = async () => {
    setState(s => ({ ...s, busy: true, message: "" }));
    try {
      await jsonFetch("/api/auth/logout", { method: "POST", body: "{}" });
      setState({ user: null, loading: false, busy: false, message: "已退出登录", calendarEnabled: false });
    } catch {
      setState(s => ({ ...s, busy: false, message: "退出失败" }));
    }
  };

  const upload = async () => {
    setState(s => ({ ...s, busy: true, message: "正在上传本机数据…" }));
    try {
      await jsonFetch("/api/sync", { method: "PUT", body: JSON.stringify({ data: readSnapshot({ touch: true }), clientUpdatedAt: Date.now() }) });
      setState(s => ({ ...s, busy: false, message: "已保存到云端" }));
    } catch {
      setState(s => ({ ...s, busy: false, message: "上传失败，请稍后再试" }));
    }
  };

  const restore = async () => {
    setState(s => ({ ...s, busy: true, message: "正在读取云端…" }));
    try {
      const res = await jsonFetch<{ snapshot: { data: Snapshot } | null }>("/api/sync");
      if (!res.snapshot) {
        setState(s => ({ ...s, busy: false, message: "云端还没有备份" }));
        return;
      }
      applySnapshot(res.snapshot.data);
    } catch {
      setState(s => ({ ...s, busy: false, message: "恢复失败，请稍后再试" }));
    }
  };

  const syncCalendar = async (enabled = state.calendarEnabled) => {
    setState(s => ({ ...s, busy: true, message: "正在同步 Google Calendar…" }));
    try {
      const res = await jsonFetch<{ synced: number; skipped: number; enabled: boolean }>("/api/calendar/sync", {
        method: "POST",
        body: JSON.stringify({ enabled, records: completedRecords satisfies PomodoroRecord[] }),
      });
      setState(s => ({
        ...s,
        busy: false,
        calendarEnabled: res.enabled,
        message: res.enabled ? `Calendar 已同步 ${res.synced} 条，跳过 ${res.skipped} 条重复记录` : "Calendar 同步已关闭",
      }));
    } catch (err) {
      const text = err instanceof Error ? err.message : "";
      const needsCalendarConsent = text.includes("calendar_permission_required") || text.includes("428");
      setState(s => ({
        ...s,
        busy: false,
        message: needsCalendarConsent ? "需要先单独授权 Google Calendar" : "Calendar 同步失败，请稍后再试",
      }));
      if (needsCalendarConsent && enabled) void openExternal("/api/auth/google/calendar");
    }
  };

  const toggleCalendar = async () => {
    await syncCalendar(!state.calendarEnabled);
  };

  if (state.loading) {
    return <div style={{ padding: 18, color: "var(--text-sec)", fontSize: 13 }}>正在读取账号状态…</div>;
  }

  if (!state.user) {
    return (
      <div style={{ padding: 18, display: "grid", gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 850, color: "var(--text)" }}>Google 云同步</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-sec)", lineHeight: 1.55 }}>未登录时只保存在本机浏览器；登录后自动备份任务、番茄记录、标签和设置。Google Calendar 会单独授权，只写入已完成番茄。</div>
        </div>
        <button type="button" onClick={() => void openExternal("/api/auth/google")} className="pressable" style={{ textAlign: "center", borderRadius: 18, padding: "12px 14px", background: "var(--text)", color: "var(--bg)", fontSize: 14, fontWeight: 850, textDecoration: "none" }}>连接 Google</button>
        {state.message && <div style={{ fontSize: 12, color: "var(--text-sec)" }}>{state.message}</div>}
      </div>
    );
  }

  return (
    <div style={{ padding: 18, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {state.user.picture && <img src={state.user.picture} alt="" width={38} height={38} style={{ width: 38, height: 38, borderRadius: "50%" }} />}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 850, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis" }}>{state.user.name || "Google 账号"}</div>
          <div style={{ fontSize: 12, color: "var(--text-sec)", overflow: "hidden", textOverflow: "ellipsis" }}>{state.user.email}</div>
        </div>
      </div>
      <div style={{ borderRadius: 16, padding: "12px 14px", background: "var(--control-bg)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 850, color: "var(--text)" }}>{statusText(syncStatus)}</div>
          <div style={{ marginTop: 2, fontSize: 11, color: "var(--text-sec)", lineHeight: 1.35 }}>登录后自动恢复较新的云端数据；本机变更会自动保存。</div>
        </div>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: syncStatus === "offline" ? "var(--accent)" : "var(--leaf)", flexShrink: 0 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button type="button" disabled={state.busy} onClick={upload} className="pressable" style={{ borderRadius: 16, padding: "11px 10px", background: "rgba(85,166,122,0.14)", color: "var(--leaf)", fontSize: 13, fontWeight: 850 }}>立即同步</button>
        <button type="button" disabled={state.busy} onClick={restore} className="pressable" style={{ borderRadius: 16, padding: "11px 10px", background: "var(--control-bg)", color: "var(--text)", fontSize: 13, fontWeight: 850 }}>从云端恢复</button>
      </div>
      <button type="button" disabled={state.busy} onClick={toggleCalendar} className="pressable" style={{ borderRadius: 16, padding: "12px 12px", background: state.calendarEnabled ? "rgba(232,100,78,0.13)" : "var(--control-bg)", color: state.calendarEnabled ? "var(--accent)" : "var(--text)", fontSize: 13, fontWeight: 850 }}>
        {state.calendarEnabled ? "同步完成的番茄到 Google Calendar" : "开启 Calendar 同步"}
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 12, color: "var(--text-sec)", lineHeight: 1.5 }}>只同步已完成的真实专注块，不把正在倒计时的草稿写进日历。</div>
        <button type="button" disabled={state.busy} onClick={signOut} className="pressable" style={{ color: "var(--text-sec)", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>退出</button>
      </div>
      {state.message && <div style={{ fontSize: 12, color: state.message.includes("失败") ? "var(--accent)" : "var(--text-sec)", lineHeight: 1.5 }}>{state.message}</div>}
    </div>
  );
}
