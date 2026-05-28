import { redirect } from "next/navigation";
import { ensureSchema } from "@/lib/server/db";
import { googleAuthUrl } from "@/lib/server/google";

export async function GET(req: Request) {
  await ensureSchema();
  redirect(googleAuthUrl(req.headers.get("host") || undefined));
}
