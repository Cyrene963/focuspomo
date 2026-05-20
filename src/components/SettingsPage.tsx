"use client";

import { useStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import CustomSlider from "@/components/CustomSlider";

function Toggle({ value, onToggle, color = "var(--leaf)" }: { value: boolean; onToggle: () => void; color?: string }) {
  return (
    <button onClick={onToggle} className="pressable" style={{
      position: "relative", width: 52, height: 32, borderRadius: 16,
      background: value ? color : "var(--separator)",
      transition: "background 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      flexShrink: 0, padding: 0,
    }}>
      <div style={{
        position: "absolute", top: 2,
        left: value ? 22 : 2,
        width: 28, height: 28, borderRadius: "50%",
        background: "#FFFFFF",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)",
        transition: "left 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      }} />
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 12, fontWeight: 600, color: "var(--text-sec)",
        textTransform: "uppercase", letterSpacing: 0.8,
        padding: "0 24px", marginBottom: 8, fontFamily: "var(--font)",
      }}>{title}</div>
      <div style={{
        background: "var(--bg-card)",
        borderRadius: 20,
        margin: "0 16px",
        overflow: "hidden",
        boxShadow: "var(--shadow)",
        transition: "background 0.4s, box-shadow 0.4s",
      }}>{children}</div>
    </div>
  );
}

function Row({ children, noBorder }: { children: React.ReactNode; noBorder?: boolean }) {
  return (
    <div style={{
      padding: "16px 20px", display: "flex", alignItems: "center",
      justifyContent: "space-between",
      borderBottom: noBorder ? "none" : "0.5px solid var(--separator)",
    }}>{children}</div>
  );
}

export default function SettingsPage() {
  const store = useStore();
  const { theme, toggle: toggleTheme } = useTheme();

  return (
    <div style={{
      height: "100%", width: "100%",
      background: "var(--bg)",
      overflow: "auto", paddingBottom: 120,
      transition: "background 0.4s",
    }}>
      {/* Header */}
      <div style={{ padding: "56px 24px 16px" }}>
        <span style={{ fontSize: "clamp(24px, 5vw, 32px)", fontWeight: 800, color: "var(--text)" }}>Settings</span>
      </div>

      <Section title="Timer">
        <div style={{ padding: "12px 20px 4px" }}>
          <CustomSlider label="" value={Math.round(store.selectedTag.duration / 60)} min={1} max={120} unit=" min" onChange={() => {}} />
        </div>
        <div style={{ padding: "4px 20px" }}>
          <CustomSlider label="" value={Math.round(store.shortBreak / 60)} min={1} max={30} unit=" min" onChange={v => store.setShortBreak(v * 60)} />
        </div>
        <div style={{ padding: "4px 20px" }}>
          <CustomSlider label="" value={Math.round(store.longBreak / 60)} min={1} max={60} unit=" min" onChange={v => store.setLongBreak(v * 60)} />
        </div>
        <div style={{ padding: "4px 20px 16px" }}>
          <CustomSlider label="" value={store.pomodoroCycle} min={2} max={8} unit=" pomos" color="var(--leaf)" onChange={v => store.setPomodoroCycle(v)} />
        </div>
      </Section>

      <Section title="Notifications">
        <Row>
          <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>Sound</span>
          <Toggle value={!store.muted} onToggle={store.toggleMute} />
        </Row>
        <Row noBorder>
          <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>Vibration</span>
          <Toggle value={true} onToggle={() => {}} />
        </Row>
      </Section>

      <Section title="Appearance">
        <Row noBorder>
          <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>Dark Mode</span>
          <Toggle value={theme === "dark"} onToggle={toggleTheme} color="var(--accent)" />
        </Row>
      </Section>

      <Section title="Date & Time">
        <Row>
          <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>Start Week On</span>
          <span style={{ fontSize: 14, color: "var(--text-sec)" }}>Sunday ›</span>
        </Row>
        <Row noBorder>
          <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>24-Hour Time</span>
          <Toggle value={false} onToggle={() => {}} />
        </Row>
      </Section>

      <Section title="Tomatoes">
        <Row noBorder>
          <div style={{ flex: 1, marginRight: 16 }}>
            <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>Display Tomatoes</span>
            <div style={{ fontSize: 12, color: "var(--text-sec)", marginTop: 4, lineHeight: 1.4 }}>
              Show all tomatoes of the month on the homepage
            </div>
          </div>
          <Toggle value={true} onToggle={() => {}} />
        </Row>
      </Section>

      <Section title="Support Us">
        <Row>
          <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>Your rating matters 👍</span>
          <span style={{ color: "var(--text-sec)", fontSize: 14 }}>›</span>
        </Row>
        <Row noBorder>
          <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>Share With Friends ^ ^</span>
          <span style={{ color: "var(--text-sec)", fontSize: 14 }}>›</span>
        </Row>
      </Section>

      <Section title="Send Feedback">
        <Row noBorder>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "var(--accent-light)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 6L2 7" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>Email Us</div>
              <div style={{ fontSize: 12, color: "var(--text-sec)", marginTop: 2 }}>focuspomo.global@gmail.com</div>
            </div>
          </div>
          <span style={{ color: "var(--text-sec)", fontSize: 14 }}>›</span>
        </Row>
      </Section>

      <Section title="More">
        <Row noBorder>
          <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>About FocusPomo</span>
          <span style={{ color: "var(--text-sec)", fontSize: 14 }}>›</span>
        </Row>
      </Section>

      {/* Footer */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 40, gap: 8 }}>
        <span style={{ fontSize: 40 }}>🍅</span>
        <span style={{ fontSize: 11, color: "var(--text-sec)", fontStyle: "italic" }}>Per aspera ad astra</span>
      </div>
    </div>
  );
}
