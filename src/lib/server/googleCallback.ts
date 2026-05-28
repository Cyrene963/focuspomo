import { redirect } from "next/navigation";
import { createSession, ensureSchema } from "@/lib/server/db";
import { googleClient, upsertGoogleUser } from "@/lib/server/google";

export async function completeGoogleCallback(req: Request) {
  await ensureSchema();
  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  if (error) redirect(`/?auth=${encodeURIComponent(error)}`);
  const code = url.searchParams.get("code");
  if (!code) redirect("/?auth=missing_code");
  const client = googleClient();
  const { tokens } = await client.getToken(code);
  const userId = await upsertGoogleUser(tokens);
  await createSession(userId);
  redirect("/?auth=connected");
}
