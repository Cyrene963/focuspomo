import { redirect } from "next/navigation";
import { createSession, ensureSchema, getSessionUser } from "@/lib/server/db";
import { enableCalendarSync, googleClient, upsertGoogleUser } from "@/lib/server/google";

export async function completeGoogleCallback(req: Request) {
  await ensureSchema();
  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  if (error) redirect(`/?auth=${encodeURIComponent(error)}`);
  const code = url.searchParams.get("code");
  if (!code) redirect("/?auth=missing_code");
  const state = url.searchParams.get("state");
  const isCalendarConsent = state === "calendar";
  const currentUser = isCalendarConsent ? await getSessionUser() : null;

  const client = googleClient();
  const { tokens } = await client.getToken(code);
  const userId = await upsertGoogleUser(tokens);

  if (isCalendarConsent) {
    if (!currentUser || currentUser.id !== userId) redirect("/?auth=calendar_account_mismatch");
    await enableCalendarSync(userId);
    redirect("/?auth=calendar_connected");
  }

  await createSession(userId);
  redirect("/?auth=connected");
}
