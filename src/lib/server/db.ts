import crypto from "crypto";
import { cookies } from "next/headers";
import { Pool, type PoolClient } from "pg";

const COOKIE_NAME = "fp_session";
const SESSION_DAYS = 90;
const APP_SESSION_TOKEN_PREFIX = "fpapp_";
const NATIVE_AUTH_EXCHANGE_TTL_MINUTES = 15;

export type NativeAuthFlow = "signin" | "calendar";

function cookieDomain() {
  return process.env.FOCUSPOMO_COOKIE_DOMAIN || (process.env.NODE_ENV === "production" ? ".bz9.me" : undefined);
}

function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    domain: cookieDomain(),
    maxAge: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
    expires: expiresAt,
  };
}

function clearCookieOptions() {
  return {
    path: "/",
    domain: cookieDomain(),
    expires: new Date(0),
    maxAge: 0,
  };
}

function bearerToken(req?: Request) {
  if (!req) return "";
  const raw = req.headers.get("authorization") || "";
  const [scheme, token] = raw.split(/\s+/, 2);
  return scheme?.toLowerCase() === "bearer" ? token || "" : "";
}

function appSessionIdFromToken(token: string) {
  return token.startsWith(APP_SESSION_TOKEN_PREFIX) ? token.slice(APP_SESSION_TOKEN_PREFIX.length) : "";
}

async function sessionIdFromRequest(req?: Request) {
  const appSessionId = appSessionIdFromToken(bearerToken(req));
  if (appSessionId) return appSessionId;
  const jar = await cookies();
  const cookieSessionId = jar.get(COOKIE_NAME)?.value || "";
  return cookieSessionId;
}

let pool: Pool | null = null;
let migrationsReady: Promise<void> | null = null;

function databaseUrl() {
  return process.env.DATABASE_URL || "postgresql:///postgres";
}

export function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: databaseUrl() });
  }
  return pool;
}

export async function ensureSchema() {
  if (!migrationsReady) {
    migrationsReady = (async () => {
      const db = getPool();
      await db.query(`
        CREATE EXTENSION IF NOT EXISTS pgcrypto
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS focuspomo_users (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          google_sub text UNIQUE NOT NULL,
          email text NOT NULL,
          name text,
          picture text,
          access_token text,
          refresh_token text,
          token_expiry timestamptz,
          calendar_sync_enabled boolean NOT NULL DEFAULT false,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS focuspomo_sessions (
          id text PRIMARY KEY,
          user_id uuid NOT NULL REFERENCES focuspomo_users(id) ON DELETE CASCADE,
          expires_at timestamptz NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS focuspomo_sync_snapshots (
          user_id uuid PRIMARY KEY REFERENCES focuspomo_users(id) ON DELETE CASCADE,
          data jsonb NOT NULL,
          client_updated_at bigint NOT NULL DEFAULT 0,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS focuspomo_calendar_events (
          user_id uuid NOT NULL REFERENCES focuspomo_users(id) ON DELETE CASCADE,
          record_id text NOT NULL,
          google_event_id text NOT NULL,
          calendar_id text NOT NULL DEFAULT 'primary',
          created_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (user_id, record_id)
        )
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS focuspomo_agent_keys (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL REFERENCES focuspomo_users(id) ON DELETE CASCADE,
          key_hash text UNIQUE NOT NULL,
          label text NOT NULL DEFAULT 'AI Agent',
          created_at timestamptz NOT NULL DEFAULT now(),
          last_used_at timestamptz
        )
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS focuspomo_native_auth_exchanges (
          nonce text PRIMARY KEY,
          session_id text NOT NULL REFERENCES focuspomo_sessions(id) ON DELETE CASCADE,
          flow text NOT NULL DEFAULT 'signin',
          expires_at timestamptz NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);
    })();
  }
  return migrationsReady;
}

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  calendarSyncEnabled: boolean;
};

export async function createSession(userId: string) {
  await ensureSchema();
  const id = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await getPool().query(
    "INSERT INTO focuspomo_sessions (id, user_id, expires_at) VALUES ($1, $2, $3)",
    [id, userId, expiresAt]
  );
  const jar = await cookies();
  jar.set(COOKIE_NAME, id, sessionCookieOptions(expiresAt));
  return id;
}

export async function storeNativeAuthExchange(nonce: string, sessionId: string, flow: NativeAuthFlow) {
  await ensureSchema();
  const expiresAt = new Date(Date.now() + NATIVE_AUTH_EXCHANGE_TTL_MINUTES * 60 * 1000);
  await getPool().query(
    `INSERT INTO focuspomo_native_auth_exchanges (nonce, session_id, flow, expires_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (nonce) DO UPDATE SET
       session_id = EXCLUDED.session_id,
       flow = EXCLUDED.flow,
       expires_at = EXCLUDED.expires_at`,
    [nonce, sessionId, flow, expiresAt]
  );
}

export async function consumeNativeAuthExchange(nonce: string) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `DELETE FROM focuspomo_native_auth_exchanges e
      WHERE e.nonce = $1
        AND e.expires_at > now()
        AND EXISTS (
          SELECT 1
            FROM focuspomo_sessions s
           WHERE s.id = e.session_id
             AND s.expires_at > now()
        )
     RETURNING e.session_id, e.flow`,
    [nonce]
  );
  if (!rows[0]) return null;
  return {
    sessionId: rows[0].session_id as string,
    flow: rows[0].flow as NativeAuthFlow,
  };
}

export async function clearSession(req?: Request) {
  const jar = await cookies();
  const sessionIds = new Set<string>();
  const cookieSessionId = jar.get(COOKIE_NAME)?.value;
  if (cookieSessionId) sessionIds.add(cookieSessionId);
  const bearerSessionId = appSessionIdFromToken(bearerToken(req));
  if (bearerSessionId) sessionIds.add(bearerSessionId);
  if (sessionIds.size > 0) {
    await ensureSchema();
    for (const sessionId of sessionIds) {
      await getPool().query("DELETE FROM focuspomo_sessions WHERE id = $1", [sessionId]);
    }
  }
  jar.set(COOKIE_NAME, "", clearCookieOptions());
}

export async function getSessionUser(req?: Request, client?: PoolClient): Promise<SessionUser | null> {
  await ensureSchema();
  const sessionId = await sessionIdFromRequest(req);
  if (!sessionId) return null;
  const db = client || getPool();
  const { rows } = await db.query(
    `SELECT u.id, u.email, u.name, u.picture, u.calendar_sync_enabled
       FROM focuspomo_sessions s
       JOIN focuspomo_users u ON u.id = s.user_id
      WHERE s.id = $1 AND s.expires_at > now()`,
    [sessionId]
  );
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    email: rows[0].email,
    name: rows[0].name,
    picture: rows[0].picture,
    calendarSyncEnabled: rows[0].calendar_sync_enabled,
  };
}

export async function requireSessionUser(req?: Request) {
  const user = await getSessionUser(req);
  if (!user) {
    const err = new Error("Not signed in");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }
  return user;
}
