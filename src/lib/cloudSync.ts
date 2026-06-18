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
  "fp-active-timer",
  "fp-theme",
  "fp-unlocked-achievements",
] as const;

export const CLIENT_UPDATED_AT_KEY = "fp-client-updated-at";
export const LOCAL_PERSIST_EVENT = "focuspomo:local-persist";
export const APP_SESSION_TOKEN_KEY = "fp-app-session-token";
export const NATIVE_AUTH_PENDING_KEY = "fp-native-auth-pending";
export const CLOUD_ORIGIN = "https://focuspomo.bz9.me";
export const APP_SCHEME_ORIGIN = "focuspomo://";

export type NativeAuthFlow = "signin" | "calendar";
type NativeAuthPending = {
  nonce: string;
  flow: NativeAuthFlow;
  createdAt: number;
};

export function isNativeApp() {
  if (typeof window === "undefined") return false;
  return window.location.protocol === "capacitor:" || window.location.protocol === "ionic:" || window.location.protocol === "focuspomo:";
}

export function apiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return isNativeApp() ? `${CLOUD_ORIGIN}${normalized}` : normalized;
}

export function externalUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${CLOUD_ORIGIN}${normalized}`;
}

function createNonce() {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function createNativeAuthReturnTo(flow: NativeAuthFlow) {
  if (typeof window === "undefined") return "";
  const pending: NativeAuthPending = { nonce: createNonce(), flow, createdAt: Date.now() };
  window.localStorage.setItem(NATIVE_AUTH_PENDING_KEY, JSON.stringify(pending));
  return encodeURIComponent(`${APP_SCHEME_ORIGIN}auth?nonce=${encodeURIComponent(pending.nonce)}`);
}

export function readNativeAuthPending(): NativeAuthPending | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(NATIVE_AUTH_PENDING_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<NativeAuthPending>;
    if (typeof parsed.nonce !== "string" || typeof parsed.flow !== "string") return null;
    if (parsed.flow !== "signin" && parsed.flow !== "calendar") return null;
    return { nonce: parsed.nonce, flow: parsed.flow, createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : 0 };
  } catch {
    return null;
  }
}

export function clearNativeAuthPending() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(NATIVE_AUTH_PENDING_KEY);
}

export function isSnapshotKey(key: string): key is typeof SNAPSHOT_KEYS[number] {
  return SNAPSHOT_KEYS.includes(key as typeof SNAPSHOT_KEYS[number]);
}

export function writeLocalSnapshotKey(key: typeof SNAPSHOT_KEYS[number], value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(LOCAL_PERSIST_EVENT, { detail: { key } }));
}

export function writeLocalRawSnapshotKey(key: typeof SNAPSHOT_KEYS[number], value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
  window.dispatchEvent(new CustomEvent(LOCAL_PERSIST_EVENT, { detail: { key } }));
}

export function writeClientUpdatedAt(updatedAt: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLIENT_UPDATED_AT_KEY, String(updatedAt));
}

export type Snapshot = Record<string, unknown>;

type PomodoroRecordLike = {
  id: string;
  tagId: string;
  tagName: string;
  tagColor: string;
  plannedDuration: number;
  actualDuration: number;
  startTime: number;
  endTime: number;
  completed: boolean;
};

type HarvestedTomatoLike = {
  id: string;
  completed: boolean;
  durationSeconds: number;
  collectedAt: number;
};

function finiteNumber(value: unknown, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function validString(value: unknown, max = 240) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function validTag(value: unknown) {
  const tag = value as Record<string, unknown>;
  return Boolean(
    tag && typeof tag === "object" &&
    validString(tag.id, 80) && validString(tag.name, 80) && validString(tag.color, 40) &&
    finiteNumber(tag.duration, 60, 120 * 60)
  );
}

function validRecord(value: unknown) {
  const record = value as Record<string, unknown>;
  return Boolean(
    record && typeof record === "object" &&
    validString(record.id, 120) && validString(record.tagId, 120) && validString(record.tagName, 120) &&
    validString(record.tagColor, 40) &&
    finiteNumber(record.plannedDuration, 0, 12 * 60 * 60) &&
    finiteNumber(record.actualDuration, 0, 12 * 60 * 60) &&
    finiteNumber(record.startTime, 0, Date.now() + 365 * 86400000) &&
    finiteNumber(record.endTime, 0, Date.now() + 365 * 86400000) &&
    typeof record.completed === "boolean"
  );
}

function validTask(value: unknown) {
  const task = value as Record<string, unknown>;
  return Boolean(
    task && typeof task === "object" &&
    validString(task.id, 120) && validString(task.title, 500) &&
    ["low", "medium", "high"].includes(String(task.priority)) &&
    typeof task.important === "boolean" && typeof task.urgent === "boolean" &&
    finiteNumber(task.estimatedPomodoros, 1, 8) &&
    typeof task.completed === "boolean" && typeof task.plannedToday === "boolean" &&
    finiteNumber(task.createdAt, 0, Date.now() + 365 * 86400000) &&
    finiteNumber(task.updatedAt, 0, Date.now() + 365 * 86400000)
  );
}

function validActiveTimer(value: unknown) {
  if (value === null) return true;
  const timer = value as Record<string, unknown>;
  return Boolean(
    timer && typeof timer === "object" && timer.state === "running" &&
    ["focus", "shortBreak", "longBreak"].includes(String(timer.session)) &&
    validString(timer.tagId, 120) && finiteNumber(timer.activeDuration, 60, 12 * 60 * 60) &&
    finiteNumber(timer.startTime, 0, Date.now() + 365 * 86400000)
  );
}

function validateSnapshotValue(key: typeof SNAPSHOT_KEYS[number], value: unknown) {
  switch (key) {
    case "fp-tags": return Array.isArray(value) && value.length > 0 && value.length <= 80 && value.every(validTag);
    case "fp-selected-tag": return Boolean(value && typeof value === "object" && validString((value as Record<string, unknown>).id, 120));
    case "fp-history": return Array.isArray(value) && value.length <= 5000 && value.every(validRecord);
    case "fp-harvested-tomatoes": return Array.isArray(value) && value.length <= 100 && value.every(v => {
      const t = v as Record<string, unknown>;
      return Boolean(t && typeof t === "object" && validString(t.id, 120) && typeof t.completed === "boolean" && finiteNumber(t.durationSeconds, 0, 12 * 60 * 60) && finiteNumber(t.collectedAt, 0, Date.now() + 365 * 86400000));
    });
    case "fp-cycle-count": return finiteNumber(value, 0, 100000);
    case "fp-tasks": return Array.isArray(value) && value.length <= 1000 && value.every(validTask);
    case "fp-pomodoro-cycle": return finiteNumber(value, 1, 12);
    case "fp-short-break":
    case "fp-long-break": return finiteNumber(value, 60, 120 * 60);
    case "fp-muted":
    case "fp-notifications-enabled":
    case "fp-vibration":
    case "fp-24-hour-time":
    case "fp-display-tomatoes":
    case "fp-tilt-tomatoes": return typeof value === "boolean";
    case "fp-active-timer": return validActiveTimer(value);
    case "fp-theme": return value === "light" || value === "dark";
    default: return false;
  }
}

export function sanitizeSnapshot(data: Snapshot): Snapshot {
  const clean: Snapshot = {};
  for (const [key, value] of Object.entries(data)) {
    if (isSnapshotKey(key) && validateSnapshotValue(key, value)) clean[key] = value;
  }
  const rawUpdatedAt = data[CLIENT_UPDATED_AT_KEY];
  if (typeof rawUpdatedAt === "number" && Number.isFinite(rawUpdatedAt)) clean[CLIENT_UPDATED_AT_KEY] = rawUpdatedAt;
  return clean;
}

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
  if (options.touch) writeClientUpdatedAt(updatedAt);
  data[CLIENT_UPDATED_AT_KEY] = updatedAt;
  return data;
}

export function snapshotSignature(data: Snapshot) {
  const clean = sanitizeSnapshot(data);
  return JSON.stringify(
    SNAPSHOT_KEYS.reduce<Snapshot>((acc, key) => {
      if (Object.prototype.hasOwnProperty.call(clean, key)) acc[key] = clean[key];
      return acc;
    }, {})
  );
}

export function hasUsefulLocalSnapshot(data: Snapshot) {
  return SNAPSHOT_KEYS.some(key => Object.prototype.hasOwnProperty.call(data, key));
}

function mergeById<T extends { id: string }>(a: T[], b: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of a) byId.set(item.id, item);
  for (const item of b) byId.set(item.id, item);
  return Array.from(byId.values());
}

function tomatoFromRecord(record: PomodoroRecordLike): HarvestedTomatoLike {
  return {
    id: record.id,
    completed: record.completed,
    durationSeconds: record.actualDuration,
    collectedAt: record.endTime,
  };
}

function mergeHarvestedFromHistory(history: PomodoroRecordLike[], harvested: HarvestedTomatoLike[]) {
  const byId = new Map<string, HarvestedTomatoLike>();
  for (const tomato of harvested) byId.set(tomato.id, tomato);
  for (const record of history) {
    if (record.completed || record.actualDuration >= 1) byId.set(record.id, tomatoFromRecord(record));
  }
  return Array.from(byId.values()).sort((a, b) => a.collectedAt - b.collectedAt).slice(-50);
}

export function mergeSnapshots(localData: Snapshot, incomingData: Snapshot): Snapshot {
  const local = sanitizeSnapshot(localData);
  const incoming = sanitizeSnapshot(incomingData);
  const merged: Snapshot = { ...local, ...incoming };

  const localHistory = Array.isArray(local["fp-history"]) ? local["fp-history"] as PomodoroRecordLike[] : [];
  const incomingHistory = Array.isArray(incoming["fp-history"]) ? incoming["fp-history"] as PomodoroRecordLike[] : [];
  const history = mergeById(localHistory, incomingHistory).sort((a, b) => a.endTime - b.endTime).slice(-5000);
  if (history.length) merged["fp-history"] = history;

  const localHarvested = Array.isArray(local["fp-harvested-tomatoes"]) ? local["fp-harvested-tomatoes"] as HarvestedTomatoLike[] : [];
  const incomingHarvested = Array.isArray(incoming["fp-harvested-tomatoes"]) ? incoming["fp-harvested-tomatoes"] as HarvestedTomatoLike[] : [];
  const harvested = mergeHarvestedFromHistory(history, mergeById(localHarvested, incomingHarvested));
  if (harvested.length) merged["fp-harvested-tomatoes"] = harvested;

  const localCycle = typeof local["fp-cycle-count"] === "number" ? local["fp-cycle-count"] as number : 0;
  const incomingCycle = typeof incoming["fp-cycle-count"] === "number" ? incoming["fp-cycle-count"] as number : 0;
  if (localCycle || incomingCycle) merged["fp-cycle-count"] = Math.max(localCycle, incomingCycle, history.filter(r => r.completed).length);

  return sanitizeSnapshot(merged);
}

export function applySnapshot(data: Snapshot) {
  if (typeof window === "undefined") return;
  const clean = sanitizeSnapshot(data);
  if (!hasUsefulLocalSnapshot(clean)) throw new Error("Cloud snapshot has no valid FocusPomo data");
  const merged = mergeSnapshots(readSnapshot(), clean);
  for (const [key, value] of Object.entries(merged)) {
    if (isSnapshotKey(key)) {
      try { writeLocalSnapshotKey(key, value); } catch {}
    }
  }
  const rawUpdatedAt = data[CLIENT_UPDATED_AT_KEY];
  writeClientUpdatedAt(typeof rawUpdatedAt === "number" && Number.isFinite(rawUpdatedAt) ? rawUpdatedAt : Date.now());
  window.location.reload();
}

export async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers || {});
  headers.set("Content-Type", "application/json");
  if (isNativeApp() && typeof window !== "undefined") {
    const token = window.localStorage.getItem(APP_SESSION_TOKEN_KEY);
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(apiUrl(url), {
    ...init,
    credentials: "include",
    headers,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}
