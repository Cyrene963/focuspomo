import { NextResponse } from "next/server";
import { clearSession } from "@/lib/server/db";

export async function POST(req: Request) {
  await clearSession(req);
  return NextResponse.json({ ok: true });
}
