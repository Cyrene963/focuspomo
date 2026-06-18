import { redirect } from "next/navigation";
import { ensureSchema } from "@/lib/server/db";
import { googleAuthUrl } from "@/lib/server/google";

function normalizeReturnTo(raw: string | null) {
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function GET(req: Request) {
  await ensureSchema();
  const returnTo = new URL(req.url).searchParams.get("returnTo") || req.headers.get("host") || undefined;
  redirect(googleAuthUrl(normalizeReturnTo(returnTo ?? null)));
}
