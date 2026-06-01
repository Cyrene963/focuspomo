import { NextResponse } from "next/server";
import { getPool, requireSessionUser } from "@/lib/server/db";

type SyncPayload = {
  data?: unknown;
  clientUpdatedAt?: number;
};

function apiError(err: unknown) {
  const status = typeof err === "object" && err && "status" in err ? Number((err as { status?: number }).status) : 500;
  return NextResponse.json({ error: status === 401 ? "Not signed in" : "Sync failed" }, { status: Number.isFinite(status) ? status : 500 });
}

export async function GET() {
  try {
    const user = await requireSessionUser();
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
    return apiError(err);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireSessionUser();
    const body = (await req.json()) as SyncPayload;
    if (!body || typeof body !== "object" || body.data === undefined || typeof body.data !== "object" || body.data === null || Array.isArray(body.data)) {
      return NextResponse.json({ error: "Missing sync data" }, { status: 400 });
    }
    const clientUpdatedAt = Number.isFinite(body.clientUpdatedAt) ? Number(body.clientUpdatedAt) : Date.now();
    const { rows } = await getPool().query(
      `INSERT INTO focuspomo_sync_snapshots (user_id, data, client_updated_at, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (user_id) DO UPDATE SET
         data = EXCLUDED.data,
         client_updated_at = EXCLUDED.client_updated_at,
         updated_at = now()
       RETURNING extract(epoch from updated_at) * 1000 AS server_updated_at`,
      [user.id, JSON.stringify(body.data), Math.round(clientUpdatedAt)]
    );
    return NextResponse.json({ ok: true, serverUpdatedAt: Math.round(Number(rows[0].server_updated_at)) });
  } catch (err) {
    return apiError(err);
  }
}
