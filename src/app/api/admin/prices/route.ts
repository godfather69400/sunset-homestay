import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateKey } from "@/lib/utils";
import { priceOverrideSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = priceOverrideSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const date = parseDateKey(parsed.data.date);
  if (!date) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const override = await prisma.priceOverride.upsert({
    where: {
      roomId_date: {
        roomId: parsed.data.roomId,
        date,
      },
    },
    update: {
      customPrice: parsed.data.customPrice,
      note: parsed.data.note,
    },
    create: {
      roomId: parsed.data.roomId,
      date,
      customPrice: parsed.data.customPrice,
      note: parsed.data.note,
    },
  });

  return NextResponse.json({ ok: true, override });
}

export async function DELETE(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await prisma.priceOverride.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
