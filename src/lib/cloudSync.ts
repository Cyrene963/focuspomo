export const SNAPSHOT_KEYS = [
  "fp-tags",
  "fp-selected-tag",
  "fp-history",
  "fp-harvested-tomatoes",
  "fp-cycle-count",
  "fp-tasks",
  "fp-pomodoro-cycle",
  "fp-short-break",
  "fp-long-break",
  "fp-muted",
  "fp-notifications-enabled",
  "fp-vibration",
  "fp-24-hour-time",
  "fp-display-tomatoes",
  "fp-tilt-tomatoes",
  "fp-theme",
] as const;

export const CLIENT_UPDATED_AT_KEY = "fp-client-updated-at";

export type Snapshot = Record<string, unknown>;

export function localClientUpdatedAt() {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(CLIENT_UPDATED_AT_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function readSnapshot(options: { touch?: boolean } = {}): Snapshot {
  const data: Snapshot = {};
  if (typeof window === "undefined") return data;
  for (const key of SNAPSHOT_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) data[key] = JSON.parse(raw);
    } catch {}
  }
  const updatedAt = options.touch ? Date.now() : localClientUpdatedAt();
  if (options.touch) window.localStorage.setItem(CLIENT_UPDATED_AT_KEY, String(updatedAt));
  data[CLIENT_UPDATED_AT_KEY] = updatedAt;
  return data;
}

export function snapshotSignature(data: Snapshot) {
  return JSON.stringify(
    SNAPSHOT_KEYS.reduce<Snapshot>((acc, key) => {
      if (Object.prototype.hasOwnProperty.call(data, key)) acc[key] = data[key];
      return acc;
    }, {})
  );
}

export function hasUsefulLocalSnapshot(data: Snapshot) {
  return SNAPSHOT_KEYS.some(key => Object.prototype.hasOwnProperty.call(data, key));
}

export function applySnapshot(data: Snapshot) {
  if (typeof window === "undefined") return;
  for (const [key, value] of Object.entries(data)) {
    if (SNAPSHOT_KEYS.includes(key as typeof SNAPSHOT_KEYS[number])) {
      try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
    }
  }
  const rawUpdatedAt = data[CLIENT_UPDATED_AT_KEY];
  if (typeof rawUpdatedAt === "number" && Number.isFinite(rawUpdatedAt)) {
    window.localStorage.setItem(CLIENT_UPDATED_AT_KEY, String(rawUpdatedAt));
  }
  window.location.reload();
}

export async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}
