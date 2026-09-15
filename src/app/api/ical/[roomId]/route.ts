import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildOutboundCalendar } from "@/lib/ical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: { roomId: string } };

export async function GET(_request: Request, { params }: RouteContext) {
  const roomId = params.roomId.replace(/\.ics$/i, "");

  const room = await prisma.room.findFirst({
    where: {
      OR: [{ id: roomId }, { slug: roomId }],
      isActive: true,
    },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const bookings = await prisma.booking.findMany({
    where: {
      roomId: room.id,
      paymentStatus: "PAID",
      checkOut: { gte: new Date() },
    },
    select: {
      id: true,
      bookingNumber: true,
      checkIn: true,
      checkOut: true,
      source: true,
    },
    orderBy: { checkIn: "asc" },
  });

  const calendar = buildOutboundCalendar(room.name, room.id, bookings);

  return new NextResponse(calendar.toString(), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${room.slug}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
