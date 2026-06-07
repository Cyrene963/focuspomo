"use client";

import { useEffect } from "react";
import AppShell from "@/components/AppShell";
import CloudSyncAgent from "@/components/CloudSyncAgent";
import AchievementCelebration from "@/components/AchievementCelebration";
import { useStore } from "@/lib/store";

export default function ClientApp() {
  const state = useStore(s => s.state);
  const start = useStore(s => s.start);
  const enterFocusMode = useStore(s => s.enterFocusMode);
  const celebratingAchievement = useStore(s => s.celebratingAchievement);
  const setCelebratingAchievement = useStore(s => s.setCelebratingAchievement);

  useEffect(() => {
    document.getElementById("focuspomo-offline-ssr-shell")?.setAttribute("data-hydrated", "true");
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("shortcut") !== "start") return;
    if (state === "idle") start();
    else enterFocusMode();
    params.delete("shortcut");
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", next);
  }, [state, start, enterFocusMode]);

  return (
    <>
      <CloudSyncAgent />
      <AppShell />
      <AchievementCelebration
        achievementId={celebratingAchievement}
        onClose={() => setCelebratingAchievement(null)}
      />
    </>
  );
}
