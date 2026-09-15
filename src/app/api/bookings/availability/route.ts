import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRoomAvailable, parseStayDates } from "@/lib/availability";
import { quoteStay } from "@/lib/pricing";
import { availabilityQuerySchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = availabilityQuerySchema.safeParse({
      checkIn: searchParams.get("checkIn"),
      checkOut: searchParams.get("checkOut"),
      guests: searchParams.get("guests") ?? 2,
      roomId: searchParams.get("roomId") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { checkIn, checkOut } = parseStayDates(parsed.data.checkIn, parsed.data.checkOut);
    const rooms = await prisma.room.findMany({
      where: {
        isActive: true,
        maxGuests: { gte: parsed.data.guests },
        id: parsed.data.roomId,
      },
      include: {
        priceOverrides: {
          where: { date: { gte: checkIn, lt: checkOut } },
        },
      },
      orderBy: { basePrice: "desc" },
    });

    const results = await Promise.all(
      rooms.map(async (room) => {
        const { available, conflict } = await isRoomAvailable(room.id, checkIn, checkOut);
        const quote = quoteStay(room.basePrice, checkIn, checkOut, room.priceOverrides);
        return {
          roomId: room.id,
          slug: room.slug,
          name: room.name,
          available,
          conflictSource: conflict?.source ?? null,
          nights: quote.nights,
          totalAmount: quote.totalAmount,
          breakdown: quote.breakdown,
        };
      }),
    );

    return NextResponse.json({ checkIn: parsed.data.checkIn, checkOut: parsed.data.checkOut, results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Availability check failed" },
      { status: 400 },
    );
  }
}
