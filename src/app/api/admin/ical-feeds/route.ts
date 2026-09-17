import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncInboundFeed } from "@/lib/ical";
import { icalFeedSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = icalFeedSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const feed = await prisma.icalFeed.upsert({
    where: {
      roomId_otaName: {
        roomId: parsed.data.roomId,
        otaName: parsed.data.otaName,
      },
    },
    update: { importUrl: parsed.data.importUrl, lastError: null },
    create: parsed.data,
  });

  try {
    const sync = await syncInboundFeed(feed.id);
    return NextResponse.json({ ok: true, feed, sync });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not pull this calendar";
    const failed = await prisma.icalFeed.update({
      where: { id: feed.id },
      data: { lastError: message, lastSyncedAt: new Date() },
    });
    return NextResponse.json({ ok: true, feed: failed, syncError: message });
  }
}
