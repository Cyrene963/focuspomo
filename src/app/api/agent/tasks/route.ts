import crypto from "crypto";
import { NextResponse } from "next/server";
import { getPool, ensureSchema } from "@/lib/server/db";
import { CLIENT_UPDATED_AT_KEY, sanitizeSnapshot, type Snapshot } from "@/lib/cloudSync";

type Priority = "low" | "medium" | "high";

type TaskItem = {
  id: string;
  title: string;
  notes?: string;
  priority: Priority;
  important: boolean;
  urgent: boolean;
  estimatedPomodoros: number;
  completed: boolean;
  plannedToday: boolean;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  dueDate?: number;
};

type PomodoroRecord = {
  id: string;
  tagId: string;
  tagName: string;
  tagColor: string;
  plannedDuration: number;
  actualDuration: number;
  startTime: number;
  endTime: number;
  completed: boolean;
  taskId?: string;
  taskTitle?: string;
};

type AgentTaskInput = {
  id?: unknown;
  title?: unknown;
  notes?: unknown;
  priority?: unknown;
  important?: unknown;
  urgent?: unknown;
  estimatedPomodoros?: unknown;
  completed?: unknown;
  plannedToday?: unknown;
  dueDate?: unknown;
};

type AgentTasksPayload = {
  email?: unknown;
  replaceToday?: unknown;
  tasks?: unknown;
};

const MAX_AGENT_TASKS = 3;
const MAX_TITLE_LENGTH = 500;
const MAX_NOTES_LENGTH = 1000;
const MAX_RETURNED_TASKS = 1000;
const MAX_RETURNED_RECORDS = 1000;

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function bearerToken(req: Request) {
  const raw = req.headers.get("authorization") || "";
  const [scheme, token] = raw.split(/\s+/, 2);
  return scheme?.toLowerCase() === "bearer" ? token : "";
}

function appSessionIdFromToken(token: string) {
  return token.startsWith("fpapp_") ? token.slice("fpapp_".length) : "";
}

function isInternalToken(req: Request) {
  const expected = process.env.FOCUSPOMO_AGENT_TOKEN;
  const actual = bearerToken(req);
  if (!expected || !actual || actual.startsWith("fp_")) return false;
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function keyHash(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

async function userIdForAgentKey(req: Request) {
  const token = bearerToken(req);
  if (!token || !token.startsWith("fp_")) return undefined;
  await ensureSchema();
  const { rows } = await getPool().query(
    `UPDATE focuspomo_agent_keys
        SET last_used_at = now()
      WHERE key_hash = $1
      RETURNING user_id`,
    [keyHash(token)]
  );
  return rows[0]?.user_id as string | undefined;
}

async function userIdForAppSession(req: Request) {
  const token = bearerToken(req);
  const sessionId = appSessionIdFromToken(token);
  if (!sessionId) return undefined;
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT u.id
       FROM focuspomo_sessions s
       JOIN focuspomo_users u ON u.id = s.user_id
      WHERE s.id = $1 AND s.expires_at > now()`,
    [sessionId]
  );
  return rows[0]?.id as string | undefined;
}

function validString(value: unknown, max: number) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}

function normalizePriority(value: unknown, important: boolean, urgent: boolean): Priority {
  if (value === "low" || value === "medium" || value === "high") return value;
  if (important && urgent) return "high";
  if (important || urgent) return "medium";
  return "low";
}

function nowTaskId(now: number, index: number) {
  return `agent-${now.toString(36)}-${index + 1}`;
}

function normalizeNewTask(input: AgentTaskInput, index: number, now: number, plannedToday = true): TaskItem | null {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title || title.length > MAX_TITLE_LENGTH) return null;
  const important = typeof input.important === "boolean" ? input.important : true;
  const urgent = typeof input.urgent === "boolean" ? input.urgent : index === 0;
  const estimated = typeof input.estimatedPomodoros === "number" && Number.isFinite(input.estimatedPomodoros)
    ? Math.max(1, Math.min(8, Math.round(input.estimatedPomodoros)))
    : 1;
  const dueDate = typeof input.dueDate === "number" && Number.isFinite(input.dueDate) ? input.dueDate : undefined;
  const notes = typeof input.notes === "string" && input.notes.trim().length > 0 ? input.notes.trim().slice(0, MAX_NOTES_LENGTH) : undefined;
  return {
    id: validString(input.id, 120) ? String(input.id).trim() : nowTaskId(now, index),
    title,
    notes,
    priority: normalizePriority(input.priority, important, urgent),
    important,
    urgent,
    estimatedPomodoros: estimated,
    completed: typeof input.completed === "boolean" ? input.completed : false,
    plannedToday: typeof input.plannedToday === "boolean" ? input.plannedToday : plannedToday,
    createdAt: now,
    updatedAt: now,
    completedAt: input.completed === true ? now : undefined,
    dueDate,
  };
}

function patchTask(task: TaskItem, patch: AgentTaskInput, now: number): TaskItem {
  const completed = typeof patch.completed === "boolean" ? patch.completed : task.completed;
  return {
    ...task,
    title: validString(patch.title, MAX_TITLE_LENGTH) ? String(patch.title).trim() : task.title,
    notes: typeof patch.notes === "string" ? (patch.notes.trim() || undefined) : task.notes,
    important: typeof patch.important === "boolean" ? patch.important : task.important,
    urgent: typeof patch.urgent === "boolean" ? patch.urgent : task.urgent,
    priority: normalizePriority(patch.priority, typeof patch.important === "boolean" ? patch.important : task.important, typeof patch.urgent === "boolean" ? patch.urgent : task.urgent),
    estimatedPomodoros: typeof patch.estimatedPomodoros === "number" && Number.isFinite(patch.estimatedPomodoros)
      ? Math.max(1, Math.min(8, Math.round(patch.estimatedPomodoros)))
      : task.estimatedPomodoros,
    plannedToday: typeof patch.plannedToday === "boolean" ? patch.plannedToday : task.plannedToday,
    completed,
    completedAt: completed ? (task.completedAt || now) : undefined,
    dueDate: typeof patch.dueDate === "number" && Number.isFinite(patch.dueDate) ? patch.dueDate : task.dueDate,
    updatedAt: now,
  };
}

async function userIdForEmail(email: string) {
  const { rows } = await getPool().query("SELECT id FROM focuspomo_users WHERE lower(email) = lower($1) LIMIT 1", [email]);
  return rows[0]?.id as string | undefined;
}

async function defaultUserId() {
  const { rows } = await getPool().query("SELECT id FROM focuspomo_users ORDER BY updated_at DESC NULLS LAST, created_at DESC LIMIT 1");
  return rows[0]?.id as string | undefined;
}

async function resolveUserId(req: Request, email?: unknown) {
  await ensureSchema();
  const token = bearerToken(req);
  if (token.startsWith("fpapp_")) {
    const appUserId = await userIdForAppSession(req);
    if (!appUserId) throw Object.assign(new Error("Invalid app session"), { status: 401 });
    return appUserId;
  }
  if (token.startsWith("fp_")) {
    const keyedUserId = await userIdForAgentKey(req);
    if (!keyedUserId) throw Object.assign(new Error("Invalid agent key"), { status: 401 });
    return keyedUserId;
  }
  if (!isInternalToken(req)) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  const userId = validString(email, 320) ? await userIdForEmail(String(email)) : await defaultUserId();
  if (!userId) throw Object.assign(new Error("No FocusPomo user found"), { status: 404 });
  return userId;
}

async function loadSnapshot(userId: string) {
  const { rows } = await getPool().query(
    "SELECT data, client_updated_at, extract(epoch from updated_at) * 1000 AS server_updated_at FROM focuspomo_sync_snapshots WHERE user_id = $1",
    [userId]
  );
  const data = rows[0]?.data && typeof rows[0].data === "object" ? sanitizeSnapshot(rows[0].data as Snapshot) : {};
  const clientUpdatedAt = rows[0]?.client_updated_at ? Number(rows[0].client_updated_at) : 0;
  const serverUpdatedAt = rows[0]?.server_updated_at ? Math.round(Number(rows[0].server_updated_at)) : 0;
  return { data, clientUpdatedAt, serverUpdatedAt };
}

async function saveSnapshot(userId: string, data: Snapshot, now: number) {
  const nextData = { ...data, [CLIENT_UPDATED_AT_KEY]: now };
  const { rows } = await getPool().query(
    `INSERT INTO focuspomo_sync_snapshots (user_id, data, client_updated_at, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (user_id) DO UPDATE SET
       data = EXCLUDED.data,
       client_updated_at = EXCLUDED.client_updated_at,
       updated_at = now()
     RETURNING extract(epoch from updated_at) * 1000 AS server_updated_at`,
    [userId, JSON.stringify(nextData), now]
  );
  return Math.round(Number(rows[0].server_updated_at));
}

function tasksFrom(data: Snapshot) {
  return Array.isArray(data["fp-tasks"]) ? (data["fp-tasks"] as TaskItem[]) : [];
}

function recordsFrom(data: Snapshot) {
  return Array.isArray(data["fp-history"]) ? (data["fp-history"] as PomodoroRecord[]) : [];
}

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeek(ms = Date.now()) {
  const d = new Date(ms);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfWeek(ms = Date.now()) {
  return startOfWeek(ms) + 7 * 24 * 60 * 60 * 1000;
}

function resourceView(data: Snapshot) {
  const tasks = tasksFrom(data);
  const records = recordsFrom(data).sort((a, b) => b.startTime - a.startTime).slice(0, MAX_RETURNED_RECORDS);
  const today = todayStart();
  const weekStart = startOfWeek();
  const weekEnd = endOfWeek();
  return {
    tasks: tasks.slice(0, MAX_RETURNED_TASKS),
    todayTasks: tasks
      .filter(task => task.plannedToday)
      .sort((a, b) => Number(a.completed) - Number(b.completed) || b.updatedAt - a.updatedAt)
      .slice(0, 3),
    focusRecords: records,
    calendar: {
      weekStart,
      weekEnd,
      records: records.filter(record => record.startTime >= weekStart && record.startTime < weekEnd),
    },
    summary: {
      openTasks: tasks.filter(task => !task.completed).length,
      completedTasks: tasks.filter(task => task.completed).length,
      completedToday: tasks.filter(task => task.completedAt && task.completedAt >= today).length,
      focusTodaySeconds: records.filter(record => record.startTime >= today).reduce((sum, record) => sum + record.actualDuration, 0),
      completedFocusToday: records.filter(record => record.startTime >= today && record.completed).length,
    },
  };
}

function apiError(err: unknown) {
  const status = typeof err === "object" && err && "status" in err ? Number((err as { status?: number }).status) : 500;
  return NextResponse.json({ error: err instanceof Error ? err.message : "FocusPomo agent API failed" }, { status: Number.isFinite(status) ? status : 500 });
}

export async function GET(req: Request) {
  if (!bearerToken(req)) return unauthorized();
  try {
    const url = new URL(req.url);
    const userId = await resolveUserId(req, url.searchParams.get("email") || undefined);
    const snapshot = await loadSnapshot(userId);
    const resource = url.searchParams.get("resource") || "overview";
    const view = resourceView(snapshot.data);
    if (resource === "snapshot") return NextResponse.json({ snapshot });
    if (resource === "tasks") return NextResponse.json({ tasks: view.tasks });
    if (resource === "todayTasks") return NextResponse.json({ todayTasks: view.todayTasks });
    if (resource === "focusRecords") return NextResponse.json({ focusRecords: view.focusRecords });
    if (resource === "calendar") return NextResponse.json({ calendar: view.calendar });
    if (resource === "summary") return NextResponse.json({ summary: view.summary });
    return NextResponse.json({ ...view, clientUpdatedAt: snapshot.clientUpdatedAt, serverUpdatedAt: snapshot.serverUpdatedAt });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: Request) {
  if (!bearerToken(req)) return unauthorized();
  try {
    const body = (await req.json()) as AgentTasksPayload & { action?: unknown; taskId?: unknown; patch?: unknown };
    const userId = await resolveUserId(req, body.email);
    const snapshot = await loadSnapshot(userId);
    const currentTasks = tasksFrom(snapshot.data);
    const now = Date.now();
    const action = typeof body.action === "string" ? body.action : "replace_today";
    let nextTasks = currentTasks;
    let changed = 0;

    if (action === "replace_today") {
      const rawTasks = Array.isArray(body.tasks) ? body.tasks.slice(0, MAX_AGENT_TASKS) : [];
      const incoming = rawTasks
        .map((task, index) => normalizeNewTask(task as AgentTaskInput, index, now, true))
        .filter((task): task is TaskItem => Boolean(task));
      if (incoming.length === 0) return NextResponse.json({ error: "No valid tasks" }, { status: 400 });
      const keep = currentTasks.map(task => ({ ...task, plannedToday: body.replaceToday === false ? task.plannedToday : false }));
      nextTasks = [...incoming, ...keep].slice(0, 1000);
      changed = incoming.length;
    } else if (action === "add_task") {
      const task = normalizeNewTask((Array.isArray(body.tasks) ? body.tasks[0] : body.patch || body) as AgentTaskInput, 0, now, false);
      if (!task) return NextResponse.json({ error: "No valid task" }, { status: 400 });
      nextTasks = [task, ...currentTasks].slice(0, 1000);
      changed = 1;
    } else if (action === "update_task") {
      if (!validString(body.taskId, 120) || !body.patch || typeof body.patch !== "object") return NextResponse.json({ error: "Missing taskId or patch" }, { status: 400 });
      nextTasks = currentTasks.map(task => task.id === body.taskId ? patchTask(task, body.patch as AgentTaskInput, now) : task);
      changed = nextTasks.some((task, index) => task !== currentTasks[index]) ? 1 : 0;
    } else if (action === "delete_task") {
      if (!validString(body.taskId, 120)) return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
      nextTasks = currentTasks.filter(task => task.id !== body.taskId);
      changed = currentTasks.length - nextTasks.length;
    } else if (action === "plan_today") {
      const ids = Array.isArray(body.tasks) ? body.tasks.map(String).slice(0, MAX_AGENT_TASKS) : [];
      if (ids.length === 0) return NextResponse.json({ error: "No task ids" }, { status: 400 });
      nextTasks = currentTasks.map(task => ({ ...task, plannedToday: ids.includes(task.id), updatedAt: ids.includes(task.id) ? now : task.updatedAt }));
      changed = ids.length;
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const serverUpdatedAt = await saveSnapshot(userId, { ...snapshot.data, "fp-tasks": nextTasks }, now);
    return NextResponse.json({ ok: true, action, changed, serverUpdatedAt, ...resourceView({ ...snapshot.data, "fp-tasks": nextTasks }) });
  } catch (err) {
    return apiError(err);
  }
}
