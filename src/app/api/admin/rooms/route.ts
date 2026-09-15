import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roomRateSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    orderBy: { basePrice: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      basePrice: true,
      maxGuests: true,
      images: true,
    },
  });

  return NextResponse.json({ rooms });
}

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = roomRateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const room = await prisma.room.update({
    where: { id: parsed.data.roomId },
    data: { basePrice: parsed.data.basePrice },
  });

  return NextResponse.json({ ok: true, room: { id: room.id, basePrice: room.basePrice } });
}
