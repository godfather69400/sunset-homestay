import { NextResponse } from "next/server";
import { syncAllInboundFeeds } from "@/lib/ical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  const url = new URL(request.url);
  const token = header?.replace("Bearer ", "") ?? url.searchParams.get("secret");
  return token === secret;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await syncAllInboundFeeds();
    return NextResponse.json({ ok: true, syncedAt: new Date().toISOString(), results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "iCal sync failed" },
      { status: 500 },
    );
  }
}

export const POST = GET;
