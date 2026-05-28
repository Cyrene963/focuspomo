import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getPool, requireSessionUser } from "@/lib/server/db";
import { authForUser } from "@/lib/server/google";

type CalendarRecord = {
  id: string;
  tagName: string;
  plannedDuration: number;
  actualDuration: number;
  startTime: number;
  endTime: number;
  completed: boolean;
};

type SyncRequest = {
  records?: CalendarRecord[];
  enabled?: boolean;
};

function calendarAuthError() {
  const err = new Error("Calendar permission is not connected");
  (err as Error & { status?: number; code?: string }).status = 428;
  (err as Error & { status?: number; code?: string }).code = "calendar_permission_required";
  return err;
}

function apiError(err: unknown) {
  const status = typeof err === "object" && err && "status" in err ? Number((err as { status?: number }).status) : 500;
  const code = typeof err === "object" && err && "code" in err ? String((err as { code?: string }).code) : undefined;
  if (status === 401) return NextResponse.json({ error: "Not signed in", code: "not_signed_in" }, { status: 401 });
  if (status === 428) return NextResponse.json({ error: "Calendar permission required", code: code || "calendar_permission_required" }, { status: 428 });
  return NextResponse.json({ error: "Calendar sync failed", code: code || "calendar_sync_failed" }, { status: Number.isFinite(status) ? status : 500 });
}

function validRecord(record: CalendarRecord) {
  return Boolean(
    record &&
    typeof record.id === "string" &&
    typeof record.tagName === "string" &&
    Number.isFinite(record.startTime) &&
    Number.isFinite(record.endTime) &&
    Number.isFinite(record.actualDuration) &&
    record.endTime > record.startTime &&
    record.actualDuration >= 60 &&
    record.completed === true
  );
}

async function hasCalendarPermission(userId: string) {
  const { rows } = await getPool().query(
    "SELECT refresh_token, calendar_sync_enabled FROM focuspomo_users WHERE id = $1",
    [userId]
  );
  return Boolean(rows[0]?.refresh_token && rows[0]?.calendar_sync_enabled);
}

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    const body = (await req.json()) as SyncRequest;
    if (typeof body.enabled === "boolean") {
      if (body.enabled && !(await hasCalendarPermission(user.id))) throw calendarAuthError();
      await getPool().query("UPDATE focuspomo_users SET calendar_sync_enabled = $2, updated_at = now() WHERE id = $1", [user.id, body.enabled]);
    }
    const enabled = body.enabled ?? user.calendarSyncEnabled;
    if (!enabled) return NextResponse.json({ ok: true, enabled: false, synced: 0, skipped: 0 });
    if (!(await hasCalendarPermission(user.id))) throw calendarAuthError();

    const records = (body.records || []).filter(validRecord).slice(0, 100);
    if (records.length === 0) return NextResponse.json({ ok: true, enabled: true, synced: 0, skipped: 0 });

    const existing = await getPool().query(
      "SELECT record_id FROM focuspomo_calendar_events WHERE user_id = $1 AND record_id = ANY($2::text[])",
      [user.id, records.map(r => r.id)]
    );
    const seen = new Set(existing.rows.map(r => r.record_id as string));
    const pending = records.filter(r => !seen.has(r.id));
    if (pending.length === 0) return NextResponse.json({ ok: true, enabled: true, synced: 0, skipped: records.length });

    const auth = await authForUser(user.id);
    const calendar = google.calendar({ version: "v3", auth });
    let synced = 0;
    for (const record of pending) {
      const minutes = Math.max(1, Math.round(record.actualDuration / 60));
      const res = await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: `🍅 ${record.tagName}`,
          description: `FocusPomo 专注记录\n计划：${Math.round(record.plannedDuration / 60)} 分钟\n实际：${minutes} 分钟`,
          start: { dateTime: new Date(record.startTime).toISOString() },
          end: { dateTime: new Date(record.endTime).toISOString() },
          extendedProperties: { private: { focuspomoRecordId: record.id } },
        },
      });
      if (res.data.id) {
        await getPool().query(
          `INSERT INTO focuspomo_calendar_events (user_id, record_id, google_event_id, calendar_id)
           VALUES ($1, $2, $3, 'primary')
           ON CONFLICT (user_id, record_id) DO NOTHING`,
          [user.id, record.id, res.data.id]
        );
        synced += 1;
      }
    }

    return NextResponse.json({ ok: true, enabled: true, synced, skipped: records.length - synced });
  } catch (err) {
    return apiError(err);
  }
}
