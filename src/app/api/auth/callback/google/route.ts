import { completeGoogleCallback } from "@/lib/server/googleCallback";

export async function GET(req: Request) {
  return completeGoogleCallback(req);
}
