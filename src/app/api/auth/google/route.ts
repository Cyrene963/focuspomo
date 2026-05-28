import { redirect } from "next/navigation";
import { ensureSchema } from "@/lib/server/db";
import { googleAuthUrl } from "@/lib/server/google";

export async function GET() {
  await ensureSchema();
  redirect(googleAuthUrl());
}
