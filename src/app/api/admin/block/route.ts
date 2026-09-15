import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateKey, addDays, generateBookingNumber } from "@/lib/utils";
import { blockDateSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = blockDateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const date = parseDateKey(parsed.data.date);
  if (!date) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const existing = await prisma.booking.findFirst({
    where: {
      roomId: parsed.data.roomId,
      source: "MANUAL",
      totalAmount: 0,
      checkIn: date,
      checkOut: addDays(date, 1),
    },
  });

  if (!parsed.data.blocked) {
    if (existing) {
      await prisma.booking.delete({ where: { id: existing.id } });
    }
    return NextResponse.json({ ok: true, blocked: false });
  }

  if (existing) {
    return NextResponse.json({ ok: true, blocked: true, bookingId: existing.id });
  }

  const booking = await prisma.booking.create({
    data: {
      bookingNumber: generateBookingNumber().replace("SPH", "BLK"),
      roomId: parsed.data.roomId,
      guestName: parsed.data.note || "Walk-in / Maintenance block",
      guestPhone: "MANUAL",
      guestEmail: "blocked@sunsetpoint.local",
      guestCount: 1,
      checkIn: date,
      checkOut: addDays(date, 1),
      totalAmount: 0,
      paymentStatus: "PAID",
      source: "MANUAL",
      notes: parsed.data.note ?? "Manual block",
    },
  });

  return NextResponse.json({ ok: true, blocked: true, bookingId: booking.id });
}
