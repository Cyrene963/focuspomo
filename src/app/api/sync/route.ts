import { NextResponse } from "next/server";
import { getPool, requireSessionUser } from "@/lib/server/db";

type SyncPayload = {
  data?: unknown;
  clientUpdatedAt?: number;
};

type Snapshot = Record<string, unknown>;
type RecordLike = { id: string; actualDuration: number; endTime: number; completed: boolean };
type TomatoLike = { id: string; completed: boolean; durationSeconds: number; collectedAt: number };

function isObject(value: unknown): value is Snapshot {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function mergeById<T extends { id: string }>(a: T[], b: T[]) {
  const byId = new Map<string, T>();
  for (const item of a) byId.set(item.id, item);
  for (const item of b) byId.set(item.id, item);
  return Array.from(byId.values());
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function tomatoFromRecord(record: RecordLike): TomatoLike {
  return { id: record.id, completed: record.completed, durationSeconds: record.actualDuration, collectedAt: record.endTime };
}

function mergeSyncData(existing: unknown, incoming: Snapshot): Snapshot {
  const old = isObject(existing) ? existing : {};
  const merged: Snapshot = { ...old, ...incoming };
  const history = mergeById(asArray<RecordLike>(old["fp-history"]), asArray<RecordLike>(incoming["fp-history"]))
    .sort((a, b) => a.endTime - b.endTime)
    .slice(-5000);
  if (history.length) merged["fp-history"] = history;

  const tomatoById = new Map<string, TomatoLike>();
  for (const tomato of mergeById(asArray<TomatoLike>(old["fp-harvested-tomatoes"]), asArray<TomatoLike>(incoming["fp-harvested-tomatoes"]))) {
    tomatoById.set(tomato.id, tomato);
  }
  for (const record of history) {
    if (record.completed || record.actualDuration >= 1) tomatoById.set(record.id, tomatoFromRecord(record));
  }
  const harvested = Array.from(tomatoById.values()).sort((a, b) => a.collectedAt - b.collectedAt).slice(-50);
  if (harvested.length) merged["fp-harvested-tomatoes"] = harvested;

  const oldCycle = typeof old["fp-cycle-count"] === "number" ? old["fp-cycle-count"] as number : 0;
  const newCycle = typeof incoming["fp-cycle-count"] === "number" ? incoming["fp-cycle-count"] as number : 0;
  if (oldCycle || newCycle || history.length) merged["fp-cycle-count"] = Math.max(oldCycle, newCycle, history.filter(r => r.completed).length);
  return merged;
}

function apiError(err: unknown) {
  const status = typeof err === "object" && err && "status" in err ? Number((err as { status?: number }).status) : 500;
  return NextResponse.json({ error: status === 401 ? "Not signed in" : "Sync failed" }, { status: Number.isFinite(status) ? status : 500 });
}

export async function GET(req: Request) {
  try {
    const user = await requireSessionUser(req);
    const { rows } = await getPool().query(
      "SELECT data, client_updated_at, extract(epoch from updated_at) * 1000 AS server_updated_at FROM focuspomo_sync_snapshots WHERE user_id = $1",
      [user.id]
    );
    return NextResponse.json({
      snapshot: rows[0]
        ? {
            data: rows[0].data,
            clientUpdatedAt: Number(rows[0].client_updated_at),
            serverUpdatedAt: Math.round(Number(rows[0].server_updated_at)),
          }
        : null,
    });
  } catch (err) {
    // If user is not authenticated, return an explicit local-only state instead
    // of a bare empty snapshot. The app can stay quiet, while API consumers do
    // not mistake "snapshot:null" for an authenticated empty cloud account.
    const status = typeof err === "object" && err && "status" in err ? Number((err as { status?: number }).status) : 500;
    if (status === 401) {
      return NextResponse.json({ authenticated: false, snapshot: null });
    }
    return apiError(err);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireSessionUser(req);
    const body = (await req.json()) as SyncPayload;
    if (!body || typeof body !== "object" || body.data === undefined || typeof body.data !== "object" || body.data === null || Array.isArray(body.data)) {
      return NextResponse.json({ error: "Missing sync data" }, { status: 400 });
    }
    const incomingData = body.data as Snapshot;
    const existing = await getPool().query(
      "SELECT data FROM focuspomo_sync_snapshots WHERE user_id = $1",
      [user.id]
    );
    const mergedData = mergeSyncData(existing.rows[0]?.data, incomingData);
    const clientUpdatedAt = Number.isFinite(body.clientUpdatedAt) ? Number(body.clientUpdatedAt) : Date.now();
    const { rows } = await getPool().query(
      `INSERT INTO focuspomo_sync_snapshots (user_id, data, client_updated_at, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (user_id) DO UPDATE SET
         data = EXCLUDED.data,
         client_updated_at = GREATEST(focuspomo_sync_snapshots.client_updated_at, EXCLUDED.client_updated_at),
         updated_at = now()
       RETURNING extract(epoch from updated_at) * 1000 AS server_updated_at`,
      [user.id, JSON.stringify(mergedData), Math.round(clientUpdatedAt)]
    );
    return NextResponse.json({ ok: true, serverUpdatedAt: Math.round(Number(rows[0].server_updated_at)) });
  } catch (err) {
    return apiError(err);
  }
}
