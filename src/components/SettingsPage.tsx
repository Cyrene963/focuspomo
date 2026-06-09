"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import CloudSyncPanel from "@/components/CloudSyncPanel";
import AgentConnectPanel from "@/components/AgentConnectPanel";

function IOSToggle({ value, onToggle, color = "#34C759" }: { value: boolean; onToggle: () => void; color?: string }) {
  return (
    <button
      onClick={onToggle}
      className="pressable"
      aria-pressed={value}
      style={{
        position: "relative",
        width: 50,
        height: 30,
        borderRadius: 15,
        background: value ? color : "rgba(120,120,128,0.18)",
        transition: "background 0.18s ease",
        flexShrink: 0,
        padding: 0,
      }}
    >
      <div style={{
        position: "absolute",
        top: 2,
        left: value ? 22 : 2,
        width: 26,
        height: 26,
        borderRadius: "50%",
        background: "#FFF",
        boxShadow: "0 2px 7px rgba(0,0,0,0.18)",
        transition: "left 0.18s ease",
      }} />
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        color: "var(--text-sec)",
        letterSpacing: 0.4,
        padding: "0 28px",
        marginBottom: 8,
      }}>{title}</div>
      <div style={{
        margin: "0 16px",
        borderRadius: 22,
        overflow: "hidden",
        background: "var(--bg-glass)",
        border: "1px solid var(--separator)",
        boxShadow: "var(--shadow)",
      }}>{children}</div>
    </section>
  );
}

function Row({
  title,
  subtitle,
  right,
  noBorder,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <div style={{
      minHeight: 58,
      padding: "12px 18px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      borderBottom: noBorder ? "none" : "0.5px solid var(--separator)",
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 650, color: "var(--text)", letterSpacing: "-0.01em" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: "var(--text-sec)", lineHeight: 1.45, marginTop: 3 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

function Stepper({
  value,
  onMinus,
  onPlus,
  suffix = "分钟",
  min,
  max,
}: {
  value: number;
  onMinus: () => void;
  onPlus: () => void;
  suffix?: string;
  min?: number;
  max?: number;
}) {
  const minusDisabled = min !== undefined && value <= min;
  const plusDisabled = max !== undefined && value >= max;
  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "rgba(224,122,69,0.12)",
    color: "var(--accent)",
    fontSize: 20,
    fontWeight: 700,
    lineHeight: "32px",
    opacity: disabled ? 0.38 : 1,
    cursor: disabled ? "default" : "pointer",
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
      <button type="button" className="pressable" disabled={minusDisabled} onClick={onMinus} style={btnStyle(minusDisabled)} aria-label="decrease">−</button>
      <div style={{ minWidth: 48, textAlign: "center", fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{value}{suffix}</div>
      <button type="button" className="pressable" disabled={plusDisabled} onClick={onPlus} style={btnStyle(plusDisabled)} aria-label="increase">+</button>
    </div>
  );
}

export default function SettingsPage() {
  const store = useStore();
  const { theme, toggle: toggleTheme } = useTheme();
  const [notificationStatus, setNotificationStatus] = useState(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );
  const durationMin = Math.round(store.selectedTag.duration / 60);
  const shortBreakMin = Math.round(store.shortBreak / 60);
  const longBreakMin = Math.round(store.longBreak / 60);
  const vibrationSupported = typeof navigator !== "undefined" && "vibrate" in navigator;
  const notificationSupported = typeof window !== "undefined" && "Notification" in window;
  const setDurationMin = (min: number) => store.setSelectedTagDuration(Math.max(1, Math.min(120, min)) * 60);
  const toggleNotifications = async () => {
    if (!notificationSupported) return;
    if (store.notificationsEnabled) {
      store.setNotificationsEnabled(false);
      return;
    }
    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    setNotificationStatus(permission);
    store.setNotificationsEnabled(permission === "granted");
  };

  return (
    <div style={{
      height: "100%",
      width: "100%",
      background: "var(--bg)",
      overflow: "auto",
      paddingBottom: 120,
      transition: "background 0.25s",
      WebkitOverflowScrolling: "touch",
      willChange: "transform",
    }}>
      <div style={{ padding: "56px 28px 18px" }}>
        <div style={{ fontSize: "clamp(28px, 6vw, 36px)", fontWeight: 850, color: "var(--text)", letterSpacing: "-0.04em" }}>设置</div>
        <div style={{ fontSize: 13, color: "var(--text-sec)", marginTop: 6 }}>只保留现在真的能用的选项。</div>
      </div>

      <Section title="计时">
        <Row
          title="默认专注时长"
          subtitle={`当前标签：${store.selectedTag.name}`}
          right={
            <Stepper
              value={durationMin}
              min={1}
              max={120}
              onMinus={() => setDurationMin(durationMin - 5)}
              onPlus={() => setDurationMin(durationMin + 5)}
            />
          }
        />
        <Row
          title="短休息"
          subtitle="完成一个番茄后的休息时长"
          right={
            <Stepper
              value={shortBreakMin}
              min={1}
              max={30}
              onMinus={() => store.setShortBreak(Math.max(1, shortBreakMin - 1) * 60)}
              onPlus={() => store.setShortBreak(Math.min(30, shortBreakMin + 1) * 60)}
            />
          }
        />
        <Row
          title="长休息"
          subtitle="完成一轮后的长休息时长"
          right={
            <Stepper
              value={longBreakMin}
              min={5}
              max={60}
              onMinus={() => store.setLongBreak(Math.max(5, longBreakMin - 5) * 60)}
              onPlus={() => store.setLongBreak(Math.min(60, longBreakMin + 5) * 60)}
            />
          }
        />
        <Row
          title="每轮番茄数"
          subtitle="达到数量后自动进入长休息"
          right={
            <Stepper
              value={store.pomodoroCycle}
              min={1}
              max={8}
              suffix="个"
              onMinus={() => store.setPomodoroCycle(Math.max(1, store.pomodoroCycle - 1))}
              onPlus={() => store.setPomodoroCycle(Math.min(8, store.pomodoroCycle + 1))}
            />
          }
          noBorder
        />
      </Section>

      <Section title="云同步">
        <CloudSyncPanel />
      </Section>

      <Section title="AI AGENT">
        <AgentConnectPanel />
      </Section>

      <Section title="提醒">
        <Row
          title="声音提醒"
          subtitle="完成番茄或休息结束时播放短提示音"
          right={<IOSToggle value={!store.muted} onToggle={store.toggleMute} />}
        />
        <Row
          title="系统通知"
          subtitle={notificationSupported ? (notificationStatus === "denied" ? "浏览器已拒绝通知，请在系统设置里重新允许。" : "完成番茄或休息结束时发本机通知。iPad 需安装到主屏幕后使用。") : "当前浏览器不支持 Web Notification，已避免显示假功能。"}
          right={notificationSupported ? <IOSToggle value={store.notificationsEnabled && notificationStatus === "granted"} onToggle={toggleNotifications} color="#E8644E" /> : undefined}
        />
        {vibrationSupported && (
          <Row
            title="震动反馈"
            subtitle="设备支持时才会生效"
            right={<IOSToggle value={store.vibration} onToggle={store.toggleVibration} />}
            noBorder
          />
        )}
        {!vibrationSupported && (
          <Row
            title="震动反馈"
            subtitle="当前浏览器不支持震动 API，已隐藏开关避免假功能。"
            noBorder
          />
        )}
      </Section>

      <Section title="外观">
        <Row
          title="倾斜番茄"
          subtitle="记住你想使用设备倾斜；iOS 可能仍要求每次打开后点一次授权。"
          right={<IOSToggle value={store.tiltTomatoes} onToggle={() => store.setTiltTomatoes(!store.tiltTomatoes)} color="#E8644E" />}
        />
        <Row
          title="深色模式"
          subtitle="切换为夜间低亮度界面"
          right={<IOSToggle value={theme === "dark"} onToggle={toggleTheme} color="#E07A45" />}
          noBorder
        />
      </Section>

      <Section title="关于">
        <Row
          title="FocusPomo"
          subtitle="仿制目标：App Store「我的番茄」。后续设置会等功能真正做好再放进来。"
          right={<span style={{ fontSize: 24 }}>🍅</span>}
          noBorder
        />
      </Section>
    </div>
  );
}
