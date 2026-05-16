"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface SettingToggle {
  label: string;
  description?: string;
  value: boolean;
  badge?: string;
}

interface SettingOption {
  label: string;
  description?: string;
  value: string;
}

export default function SettingsPage() {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    displayTomatoes: true,
    showAbandoned: true,
    notification: true,
    sync: false,
   二十四小时: false,
    appleHealth: false,
  });

  const toggle = (key: string) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen px-6 py-6 pb-24">
      <h1 className="text-2xl font-bold text-brown-800 mb-6">Settings</h1>

      {/* Tomatoes Setting */}
      <Section title="Tomatoes Setting">
        <ToggleRow
          label="Display Tomatoes for a month"
          description="The homepage will display all the tomatoes of the month, and the number will be reset at the beginning of month."
          value={toggles.displayTomatoes}
          onToggle={() => toggle("displayTomatoes")}
        />
        <ToggleRow
          label="Show Abandoned Tomatoes"
          description="After abandoning the ongoing tomatoes, the abandoned tomatoes will display on homepage."
          value={toggles.showAbandoned}
          onToggle={() => toggle("showAbandoned")}
        />
      </Section>

      {/* Pomodoro Technique */}
      <Section title="Pomodoro Technique">
        <OptionRow
          label="Pomodoro Cycle"
          description="Typically, every 4 Pomodoros make up a cycle, which helps us get into a deep focus mode."
          value="4"
        />
        <OptionRow
          label="Short Break"
          description="After each Pomodoro, you can take a short break. It helps refresh your mind."
          value="5min"
        />
        <OptionRow
          label="Long Break"
          description="After each Pomodoro cycle, you can take a longer break. This helps restore your energy."
          value="20min"
        />
      </Section>

      {/* Date & Time */}
      <Section title="Date & Time">
        <OptionRow label="Start Week On" value="Sunday" />
        <ToggleRow
          label="24-Hour Time"
          value={toggles.二十四小时}
          onToggle={() => toggle("二十四小时")}
        />
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <OptionRow
          label="Pomodoros Reminder"
          description="You will receive notification after you finished a pomodoro or end a break."
          value={toggles.notification ? "on" : "off"}
        />
      </Section>

      {/* Sync */}
      <Section title="Sync" infoIcon>
        <ToggleRow
          label="Sync with iCloud"
          description={toggles.sync ? "Synced" : "Not Synced"}
          value={toggles.sync}
          onToggle={() => toggle("sync")}
          badge="PLUS"
        />
        <OptionRow
          label="Sync to Calendar"
          description="Your focus data will be synced to the calendar"
          badge="PLUS"
        />
      </Section>

      {/* General */}
      <Section title="General">
        <OptionRow label="Language" value="English" />
        <ToggleRow
          label="Apple Health"
          description="Your focus data will sync with Apple Health"
          value={toggles.appleHealth}
          onToggle={() => toggle("appleHealth")}
        />
      </Section>

      {/* Support */}
      <Section title="Support Us">
        <OptionRow label="Your rating matters 👍" />
        <OptionRow label="Share FocusPomo With Friends ^ ^" />
      </Section>

      {/* About */}
      <Section title="More">
        <div className="px-4 py-3">
          <h4 className="font-semibold text-brown-800 text-sm">About FocusPomo</h4>
          <p className="text-xs text-brown-700/40 mt-1">
            We hope to make a truly effective, easy-to-use and elegant Pomodoro timer app to help you work smarter, not harder.
          </p>
        </div>
        <div className="px-4 py-3 border-t border-cream-300/50">
          <h4 className="font-semibold text-brown-800 text-sm">Version 1.0.0</h4>
          <p className="text-xs text-brown-700/40 mt-1">
            Your valuable feedback will help us make FocusPomo even better.
          </p>
        </div>
      </Section>

      {/* Footer tomato */}
      <div className="flex flex-col items-center mt-8 mb-4">
        <svg width="48" height="56" viewBox="0 0 60 72">
          <path d="M25 8 Q22 -4 30 -2 Q38 -4 35 8" fill="#4CAF50" />
          <line x1="30" y1="0" x2="30" y2="10" stroke="#388E3C" strokeWidth="2" />
          <circle cx="30" cy="40" r="22" fill="#F06858" />
          <circle cx="23" cy="33" r="7" fill="rgba(255,255,255,0.25)" />
          <circle cx="24" cy="38" r="1.5" fill="#3A2A1C" />
          <circle cx="36" cy="38" r="1.5" fill="#3A2A1C" />
          <path d="M25 44 Q30 49 35 44" fill="none" stroke="#3A2A1C" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p className="text-xs text-brown-700/30 mt-2 italic">Per aspera ad astra</p>
      </div>
    </div>
  );
}

function Section({ title, infoIcon, children }: { title: string; infoIcon?: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <div className="flex items-center gap-1 mb-2">
        <span className="text-xs text-brown-700/40 font-medium">{title}</span>
        {infoIcon && <span className="text-xs text-brown-700/30">ℹ️</span>}
      </div>
      <div className="bg-cream-200/50 rounded-card overflow-hidden divide-y divide-cream-300/30">
        {children}
      </div>
    </motion.div>
  );
}

function ToggleRow({ label, description, value, onToggle, badge }: {
  label: string;
  description?: string;
  value: boolean;
  onToggle: () => void;
  badge?: string;
}) {
  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <div className="flex-1 mr-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-brown-800">{label}</span>
          {badge && (
            <span className="bg-coral-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm">{badge}</span>
          )}
        </div>
        {description && <p className="text-[11px] text-brown-700/40 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={onToggle}
        className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
          value ? "bg-coral-500" : "bg-cream-300"
        }`}
      >
        <motion.div
          animate={{ x: value ? 22 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm"
        />
      </button>
    </div>
  );
}

function OptionRow({ label, description, value, badge }: {
  label: string;
  description?: string;
  value?: string;
  badge?: string;
}) {
  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-brown-800">{label}</span>
          {badge && (
            <span className="bg-coral-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm">{badge}</span>
          )}
        </div>
        {description && <p className="text-[11px] text-brown-700/40 mt-0.5">{description}</p>}
      </div>
      {value && (
        <div className="flex items-center gap-1 text-brown-700/40 text-sm">
          {value} <span>›</span>
        </div>
      )}
    </div>
  );
}
