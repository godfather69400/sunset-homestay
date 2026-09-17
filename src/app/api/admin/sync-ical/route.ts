import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { syncAllInboundFeeds } from "@/lib/ical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await syncAllInboundFeeds();
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "iCal sync failed" },
      { status: 500 },
    );
  }
}
