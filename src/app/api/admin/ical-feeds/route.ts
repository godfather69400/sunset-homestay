import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { icalFeedSchema } from "@/lib/validations";

export const runtime = "nodejs";

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

  return NextResponse.json({ ok: true, feed });
}
