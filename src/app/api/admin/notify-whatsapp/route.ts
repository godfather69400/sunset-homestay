import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendBookingConfirmation } from "@/lib/whatsapp";

export const runtime = "nodejs";

const schema = z.object({ id: z.string().min(1) });

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Booking id required" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.id },
    include: { room: true },
  });
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const whatsapp = await sendBookingConfirmation({
    guestName: booking.guestName,
    guestPhone: booking.guestPhone,
    bookingNumber: booking.bookingNumber,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    roomName: booking.room.name,
  });

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      whatsappSentAt: whatsapp.sent ? new Date() : null,
      whatsappError: whatsapp.error ?? null,
    },
  });

  if (!whatsapp.sent) {
    return NextResponse.json({ error: whatsapp.error ?? "WhatsApp send failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, warning: whatsapp.error });
}
