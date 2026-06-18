import { redirect } from "next/navigation";
import { ensureSchema } from "@/lib/server/db";
import { googleCalendarAuthUrl } from "@/lib/server/google";

export async function GET(req: Request) {
  await ensureSchema();
  const returnTo = new URL(req.url).searchParams.get("returnTo") || req.headers.get("host") || undefined;
  redirect(googleCalendarAuthUrl(returnTo || undefined));
}
