import crypto from "crypto";
import { redirect } from "next/navigation";
import { createSession, ensureSchema, getSessionUser, storeNativeAuthExchange } from "@/lib/server/db";
import { enableCalendarSync, decodeOAuthState, googleClient, upsertGoogleUser } from "@/lib/server/google";

const APP_SCHEME_ORIGIN = "focuspomo://";

function webAppOrigin() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://focuspomo.bz9.me";
}

function isNativeAppReturn(returnTo?: string) {
  return Boolean(returnTo && returnTo.startsWith("focuspomo://"));
}

function nativeAuthNonce(returnTo?: string) {
  if (!returnTo || !isNativeAppReturn(returnTo)) return "";
  try {
    return new URL(returnTo).searchParams.get("nonce") || "";
  } catch {
    return "";
  }
}

function nativeAuthRedirect(returnTo: string | undefined, auth: string): never {
  const target = new URL(`${APP_SCHEME_ORIGIN}auth`);
  target.searchParams.set("auth", auth);
  const nonce = nativeAuthNonce(returnTo);
  if (nonce) target.searchParams.set("nonce", nonce);
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
  }

  const sessionId = await createSession(userId);
  const nonce = nativeAuthNonce(oauthState.returnTo);
  if (nonce) {
    await storeNativeAuthExchange(nonce, sessionId, isCalendarConsent ? "calendar" : "signin");
  }

  if (isNativeAppReturn(oauthState.returnTo)) {
    const appToken = `fpapp_${sessionId}`;
    go(oauthState.returnTo, `token:${appToken}`);
  }
  go(oauthState.returnTo, isCalendarConsent ? "calendar_connected" : "connected");
}
