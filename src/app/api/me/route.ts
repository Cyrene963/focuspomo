import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/db";

export async function GET(req: Request) {
  const user = await getSessionUser(req);
  return NextResponse.json({ user });
}
