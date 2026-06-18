"use client";

import { useEffect } from "react";
import AppShell from "@/components/AppShell";
import CloudSyncAgent from "@/components/CloudSyncAgent";
import AchievementCelebration from "@/components/AchievementCelebration";
import { useStore } from "@/lib/store";
import { APP_SESSION_TOKEN_KEY, APP_SCHEME_ORIGIN, clearNativeAuthPending, isNativeApp, readNativeAuthPending } from "@/lib/cloudSync";
import { jsonFetch } from "@/lib/cloudSync";

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

  useEffect(() => {
    if (!isNativeApp()) return;
    let disposed = false;
    let listener: { remove(): Promise<void> } | null = null;
    let stateListener: { remove(): Promise<void> } | null = null;
    const closeBrowser = async () => {
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.close();
      } catch {}
    };
    const syncNativeSession = async (nonce?: string) => {
      const pending = readNativeAuthPending();
      const effectiveNonce = nonce || pending?.nonce || "";
      if (!effectiveNonce) return;
      try {
        const res = await jsonFetch<{ token?: string; ok?: boolean }>("/api/auth/native/exchange", {
          method: "POST",
          body: JSON.stringify({ nonce: effectiveNonce }),
        });
        if (res.token) {
          window.localStorage.setItem(APP_SESSION_TOKEN_KEY, res.token);
          clearNativeAuthPending();
          await closeBrowser();
          window.document.documentElement.setAttribute("data-focuspomo-auth", "connected");
          window.dispatchEvent(new CustomEvent("focuspomo:auth", { detail: { auth: pending?.flow === "calendar" ? "calendar_connected" : "connected" } }));
        }
      } catch {}
    };
    const handleAuthUrl = async (url: string) => {
      if (!url.startsWith(`${APP_SCHEME_ORIGIN}auth`)) return;
      const parsed = new URL(url.replace(APP_SCHEME_ORIGIN, "https://focuspomo.local/"));
      const auth = parsed.searchParams.get("auth");
      if (!auth) return;
      if (auth.startsWith("token:")) {
        const token = auth.slice("token:".length).split(":")[0] || "";
        if (token) {
          window.localStorage.setItem(APP_SESSION_TOKEN_KEY, token);
          await closeBrowser();
          window.document.documentElement.setAttribute("data-focuspomo-auth", "connected");
          window.dispatchEvent(new CustomEvent("focuspomo:auth", { detail: { auth: "connected" } }));
        }
        await syncNativeSession(parsed.searchParams.get("nonce") || undefined);
        return;
      }
      if (auth === "connected" || auth === "calendar_connected") {
        await closeBrowser();
      }
      await syncNativeSession(parsed.searchParams.get("nonce") || undefined);
      const next = new URL(window.location.href);
      next.searchParams.set("auth", auth);
      window.history.replaceState({}, "", `${next.pathname}?${next.searchParams.toString()}${next.hash}`);
      window.document.documentElement.setAttribute("data-focuspomo-auth", auth);
      window.dispatchEvent(new CustomEvent("focuspomo:auth", { detail: { auth } }));
    };

    void import("@capacitor/app").then(async ({ App }) => {
      listener = await App.addListener("appUrlOpen", ({ url }) => {
        void handleAuthUrl(url);
      });
      stateListener = await App.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) return;
        const pending = readNativeAuthPending();
        if (pending?.nonce) void syncNativeSession(pending.nonce);
      });
      if (disposed) {
        void listener.remove();
        void stateListener?.remove();
        return;
      }
      try {
        const launch = await App.getLaunchUrl();
        if (launch?.url) await handleAuthUrl(launch.url);
        else {
          const pending = readNativeAuthPending();
          if (pending?.nonce) await syncNativeSession(pending.nonce);
        }
      } catch {}
    });

    return () => {
      disposed = true;
      if (listener) void listener.remove();
      if (stateListener) void stateListener.remove();
    };
  }, []);

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
