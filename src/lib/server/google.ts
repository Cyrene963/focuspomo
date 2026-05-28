import { google } from "googleapis";
import { type Credentials } from "google-auth-library";
import { getPool } from "@/lib/server/db";

export const GOOGLE_SIGN_IN_SCOPES = [
  "openid",
  "email",
  "profile",
];

export const GOOGLE_CALENDAR_SCOPES = [
  ...GOOGLE_SIGN_IN_SCOPES,
  "https://www.googleapis.com/auth/calendar.events",
];

function baseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://focuspomo.bz9.me";
}

export function googleRedirectUri() {
  return `${baseUrl()}/api/auth/callback/google`;
}

export function googleClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Missing Google OAuth credentials");
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    googleRedirectUri()
  );
}

export function googleAuthUrl() {
  return googleClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: GOOGLE_SIGN_IN_SCOPES,
  });
}

export function googleCalendarAuthUrl() {
  return googleClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: GOOGLE_CALENDAR_SCOPES,
    state: "calendar",
  });
}

export async function upsertGoogleUser(tokens: Credentials) {
  const oauth2 = googleClient();
  oauth2.setCredentials(tokens);
  const oauth2api = google.oauth2({ version: "v2", auth: oauth2 });
  const { data } = await oauth2api.userinfo.get();
  if (!data.id || !data.email) throw new Error("Google account did not return profile identity");

  const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;
  const { rows } = await getPool().query(
    `INSERT INTO focuspomo_users (google_sub, email, name, picture, access_token, refresh_token, token_expiry, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     ON CONFLICT (google_sub) DO UPDATE SET
       email = EXCLUDED.email,
       name = EXCLUDED.name,
       picture = EXCLUDED.picture,
       access_token = COALESCE(EXCLUDED.access_token, focuspomo_users.access_token),
       refresh_token = COALESCE(EXCLUDED.refresh_token, focuspomo_users.refresh_token),
       token_expiry = COALESCE(EXCLUDED.token_expiry, focuspomo_users.token_expiry),
       updated_at = now()
     RETURNING id`,
    [data.id, data.email, data.name || null, data.picture || null, tokens.access_token || null, tokens.refresh_token || null, expiresAt]
  );
  return rows[0].id as string;
}

export async function enableCalendarSync(userId: string) {
  await getPool().query(
    "UPDATE focuspomo_users SET calendar_sync_enabled = true, updated_at = now() WHERE id = $1",
    [userId]
  );
}

export async function authForUser(userId: string) {
  const { rows } = await getPool().query(
    "SELECT access_token, refresh_token, token_expiry FROM focuspomo_users WHERE id = $1",
    [userId]
  );
  const row = rows[0];
  if (!row?.refresh_token && !row?.access_token) throw new Error("Google account is not connected");
  const auth = googleClient();
  auth.setCredentials({
    access_token: row.access_token || undefined,
    refresh_token: row.refresh_token || undefined,
    expiry_date: row.token_expiry ? new Date(row.token_expiry).getTime() : undefined,
  });
  auth.on("tokens", async (tokens) => {
    await getPool().query(
      `UPDATE focuspomo_users
          SET access_token = COALESCE($2, access_token),
              refresh_token = COALESCE($3, refresh_token),
              token_expiry = COALESCE($4, token_expiry),
              updated_at = now()
        WHERE id = $1`,
      [userId, tokens.access_token || null, tokens.refresh_token || null, tokens.expiry_date ? new Date(tokens.expiry_date) : null]
    );
  });
  return auth;
}
