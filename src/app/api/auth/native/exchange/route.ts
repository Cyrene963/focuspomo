import { NextResponse } from "next/server";
import { consumeNativeAuthExchange } from "@/lib/server/db";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as { nonce?: unknown };
    const nonce = typeof body.nonce === "string" ? body.nonce.trim() : "";
    if (!nonce) return NextResponse.json({ error: "Missing nonce" }, { status: 400 });

    const exchange = await consumeNativeAuthExchange(nonce);
    if (!exchange) return NextResponse.json({ error: "Exchange expired or missing" }, { status: 404 });

    return NextResponse.json({
      ok: true,
      token: `fpapp_${exchange.sessionId}`,
      flow: exchange.flow,
    });
  } catch (err) {
    const status = typeof err === "object" && err && "status" in err ? Number((err as { status?: number }).status) : 500;
    return NextResponse.json({ error: "Native auth exchange failed" }, { status: Number.isFinite(status) ? status : 500 });
  }
}
