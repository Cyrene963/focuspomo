import { redirect } from "next/navigation";
import { createSession, ensureSchema, getSessionUser } from "@/lib/server/db";
import { enableCalendarSync, decodeOAuthState, googleClient, upsertGoogleUser } from "@/lib/server/google";

function appOriginFor(returnTo?: string) {
  if (returnTo && returnTo.startsWith("focuspomo://")) return returnTo.replace(/\/?$/, "");
  if (returnTo && /(^|\.)bz9\.me(?::\d+)?$/.test(returnTo)) return `https://${returnTo}`;
  return process.env.NEXT_PUBLIC_APP_URL || "https://focuspomo.bz9.me";
}

function go(returnTo: string | undefined, auth: string): never {
  const target = appOriginFor(returnTo);
  const hasQuery = target.includes("?");
  const separator = hasQuery ? "&" : "?";
  redirect(`${target}${separator}auth=${encodeURIComponent(auth)}`);
}

export async function completeGoogleCallback(req: Request) {
  await ensureSchema();
  const url = new URL(req.url);
  const oauthState = decodeOAuthState(url.searchParams.get("state"));
  const error = url.searchParams.get("error");
  if (error) go(oauthState.returnTo, error);
  const code = url.searchParams.get("code");
  if (!code) go(oauthState.returnTo, "missing_code");
  const isCalendarConsent = oauthState.flow === "calendar";
  const currentUser = isCalendarConsent ? await getSessionUser() : null;

  const client = googleClient();
  const { tokens } = await client.getToken(code);
  const userId = await upsertGoogleUser(tokens);

  if (isCalendarConsent) {
    if (!currentUser || currentUser.id !== userId) go(oauthState.returnTo, "calendar_account_mismatch");
    await enableCalendarSync(userId);
    go(oauthState.returnTo, "calendar_connected");
  }

  await createSession(userId);
  go(oauthState.returnTo, "connected");
}
