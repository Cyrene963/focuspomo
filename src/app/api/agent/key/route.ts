import crypto from "crypto";
import { NextResponse } from "next/server";
import { ensureSchema, getPool, requireSessionUser } from "@/lib/server/db";

function hashKey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function appUrl(req: Request) {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/$/, "");
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(req: Request) {
  try {
    const user = await requireSessionUser();
    await ensureSchema();
    const { rows } = await getPool().query(
      `SELECT id, label, created_at, last_used_at
         FROM focuspomo_agent_keys
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1`,
      [user.id]
    );
    return NextResponse.json({
      connected: Boolean(rows[0]),
      key: null,
      keyInfo: rows[0] || null,
      mcp: {
        endpoint: `${appUrl(req)}/api/agent/tasks`,
        project: "FocusPomo — local-first Pomodoro, todo, calendar, and focus-record PWA",
        resources: ["tasks", "todayTasks", "focusRecords", "calendar", "summary", "snapshot"],
        actions: ["replace_today", "add_task", "update_task", "delete_task", "plan_today"],
      },
    });
  } catch (err) {
    const status = typeof err === "object" && err && "status" in err ? Number((err as { status?: number }).status) : 500;
    return NextResponse.json({ error: status === 401 ? "Not signed in" : "Agent key failed" }, { status: Number.isFinite(status) ? status : 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    await ensureSchema();
    const body = await req.json().catch(() => ({})) as { label?: unknown };
    const key = `fp_${crypto.randomBytes(32).toString("base64url")}`;
    const label = typeof body.label === "string" && body.label.trim() ? body.label.trim().slice(0, 80) : "AI Agent";
    await getPool().query("DELETE FROM focuspomo_agent_keys WHERE user_id = $1", [user.id]);
    const { rows } = await getPool().query(
      `INSERT INTO focuspomo_agent_keys (user_id, key_hash, label)
       VALUES ($1, $2, $3)
       RETURNING id, label, created_at, last_used_at`,
      [user.id, hashKey(key), label]
    );
    return NextResponse.json({
      connected: true,
      key,
      keyInfo: rows[0],
      mcp: {
        endpoint: `${appUrl(req)}/api/agent/tasks`,
        project: "FocusPomo — local-first Pomodoro, todo, calendar, and focus-record PWA",
        resources: ["tasks", "todayTasks", "focusRecords", "calendar", "summary", "snapshot"],
        actions: ["replace_today", "add_task", "update_task", "delete_task", "plan_today"],
      },
    });
  } catch (err) {
    const status = typeof err === "object" && err && "status" in err ? Number((err as { status?: number }).status) : 500;
    return NextResponse.json({ error: status === 401 ? "Not signed in" : "Agent key failed" }, { status: Number.isFinite(status) ? status : 500 });
  }
}
