import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { apiUrl, externalUrl, isNativeApp } from "@/lib/cloudSync";

type NotificationPermissionState = "prompt" | "granted" | "denied" | "unsupported";
type MotionGravityEvent = {
  x: number;
  y: number;
  z: number;
  source: "native-motion";
};

type FocusPomoMotionPlugin = {
  start(): Promise<{ available: boolean }>;
  stop(): Promise<void>;
  addListener(eventName: "accel", listenerFunc: (event: MotionGravityEvent) => void): Promise<PluginListenerHandle>;
};

type NotificationDescriptor = { id: number };

let notificationChannelReady = false;
const FocusPomoSettings = registerPlugin<{ openSettings(): Promise<void> }>("FocusPomoSettings");
const FocusPomoMotion = registerPlugin<FocusPomoMotionPlugin>("FocusPomoMotion");

export { apiUrl, externalUrl, isNativeApp };

function normalizeWebNotificationPermission(permission: NotificationPermission): NotificationPermissionState {
  return permission === "default" ? "prompt" : permission;
}

export async function notificationPermission(): Promise<NotificationPermissionState> {
  if (isNativeApp()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const status = await LocalNotifications.checkPermissions();
      return status.display === "granted" ? "granted" : status.display === "denied" ? "denied" : "prompt";
    } catch {
      return "unsupported";
    }
  }

  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return normalizeWebNotificationPermission(Notification.permission);
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (isNativeApp()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const status = await LocalNotifications.requestPermissions();
      return status.display === "granted" ? "granted" : status.display === "denied" ? "denied" : "prompt";
    } catch {
      return "unsupported";
    }
  }

  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  return normalizeWebNotificationPermission(permission);
}

async function ensureNotificationChannel() {
  if (!isNativeApp() || notificationChannelReady) return;
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.getPlatform() !== "android") {
      notificationChannelReady = true;
      return;
    }
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.createChannel({
      id: "focuspomo-timer",
      name: "FocusPomo Timer",
      description: "Timer completion reminders",
      importance: 5,
      visibility: 1,
      sound: "default",
      vibration: true,
      lights: true,
      lightColor: "#E8644E",
    });
    notificationChannelReady = true;
  } catch {}
}

export async function showTimerNotification(title: string, body: string) {
  const permission = await notificationPermission();
  if (permission !== "granted") return;

  if (isNativeApp()) {
    try {
      await ensureNotificationChannel();
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      await LocalNotifications.schedule({
        notifications: [{
          id: Date.now() % 2147483647,
          title,
          body,
          channelId: "focuspomo-timer",
          schedule: { at: new Date(Date.now() + 250) },
          smallIcon: "ic_stat_icon_config_sample",
        }],
      });
    } catch {}
    return;
  }

  try {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => reg.showNotification(title, { body, icon: "/icon-1779372627-192.png", badge: "/favicon-1779372627-32.png" }))
        .catch(() => new Notification(title, { body, icon: "/icon-1779372627-192.png" }));
    } else {
      new Notification(title, { body, icon: "/icon-1779372627-192.png" });
    }
  } catch {}
}

export async function hapticSuccess(enabled: boolean) {
  if (!enabled) return;
  if (isNativeApp()) {
    try {
      const { Haptics, NotificationType } = await import("@capacitor/haptics");
      await Haptics.notification({ type: NotificationType.Success });
    } catch {}
    return;
  }

  try { if (navigator.vibrate) navigator.vibrate(200); } catch {}
}

export function vibrationSupported() {
  return isNativeApp() || (typeof navigator !== "undefined" && "vibrate" in navigator);
}

export async function openExternal(path: string) {
  const url = externalUrl(path);
  if (isNativeApp()) {
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url, presentationStyle: "fullscreen" });
      return;
    } catch {}
  }
  window.location.href = url;
}

export async function openInAppBrowser(url: string) {
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(url);
  const target = isNativeApp() && !hasScheme ? externalUrl(url) : url;
  if (isNativeApp()) {
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: target, presentationStyle: "fullscreen" });
      return;
    } catch {}
  }
  window.location.href = target;
}

export async function closeInAppBrowser() {
  if (!isNativeApp()) return;
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {}
}

export async function openAppSettings() {
  if (!isNativeApp()) return;
  try {
    await FocusPomoSettings.openSettings();
    return;
  } catch {
    try {
      window.location.href = "app-settings:";
    } catch {
      try { window.location.href = "app-settings://"; } catch {}
    }
  }
}

function timerNotificationId(kind: "focus" | "break") {
  return kind === "focus" ? 24001 : 24002;
}

export async function scheduleTimerNotification(kind: "focus" | "break", title: string, body: string, secondsFromNow: number) {
  const permission = await notificationPermission();
  if (permission !== "granted") return;
  if (!isNativeApp()) return;
  try {
    await ensureNotificationChannel();
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id: timerNotificationId(kind) }] });
    await LocalNotifications.schedule({
      notifications: [{
        id: timerNotificationId(kind),
        title,
        body,
        channelId: "focuspomo-timer",
        schedule: { at: new Date(Date.now() + Math.max(5, secondsFromNow) * 1000) },
        smallIcon: "ic_stat_icon_config_sample",
        extra: { kind },
      }],
    });
  } catch {}
}

export async function cancelTimerNotifications() {
  if (!isNativeApp()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id: timerNotificationId("focus") }, { id: timerNotificationId("break") }] });
  } catch {}
}

export async function addNativeMotionListener(onMotion: (event: MotionGravityEvent) => void): Promise<(() => void) | null> {
  if (!isNativeApp()) return null;
  let listener: PluginListenerHandle | undefined;
  try {
    listener = await FocusPomoMotion.addListener("accel", (event) => {
      const { x, y, z } = event;
      if (typeof x === "number" && typeof y === "number") {
        onMotion({ x, y, z: typeof z === "number" ? z : 0, source: "native-motion" });
      }
    });
    const started = await FocusPomoMotion.start();
    const listenerHandle = listener;
    if (!listenerHandle) return null;
    if (!started.available) {
      await listenerHandle.remove();
      return null;
    }
    return async () => {
      try { await listenerHandle.remove(); } catch {}
      try { await FocusPomoMotion.stop(); } catch {}
    };
  } catch {
    try { await listener?.remove(); } catch {}
    return null;
  }
}
