import crypto from "crypto";
import { redirect } from "next/navigation";
import { createSession, ensureSchema, getSessionUser } from "@/lib/server/db";
import { enableCalendarSync, decodeOAuthState, googleClient, upsertGoogleUser } from "@/lib/server/google";

function webAppOrigin() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://focuspomo.bz9.me";
}

function isNativeAppReturn(returnTo?: string) {
  return Boolean(returnTo && returnTo.startsWith("focuspomo://"));
}

function nativeAuthRedirect(returnTo: string | undefined, auth: string): never {
  const target = new URL("/native-auth", webAppOrigin());
  target.searchParams.set("auth", auth);
  if (returnTo) {
    try {
      const nonce = new URL(returnTo).searchParams.get("nonce");
      if (nonce) target.searchParams.set("nonce", nonce);
    } catch {}
  }
  redirect(target.toString());
}

function go(returnTo: string | undefined, auth: string): never {
  if (isNativeAppReturn(returnTo)) nativeAuthRedirect(returnTo, auth);
  const target = new URL(webAppOrigin());
  if (returnTo && /(^|\.)bz9\.me(?::\d+)?$/.test(returnTo)) {
    try {
      const parsed = new URL(returnTo.startsWith("http") ? returnTo : `https://${returnTo}`);
      target.search = parsed.search;
    } catch {}
  }
  target.searchParams.set("auth", auth);
  redirect(target.toString());
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

  const sessionId = await createSession(userId);
  if (isNativeAppReturn(oauthState.returnTo)) {
    const appToken = `fpapp_${sessionId}`;
    go(oauthState.returnTo, `token:${appToken}`);
  }
  go(oauthState.returnTo, "connected");
}
