import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDays, eachNight, startOfDay, toDateKey } from "@/lib/utils";
import { quoteStay } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const monthParam = new URL(request.url).searchParams.get("month");
  const base = monthParam ? new Date(`${monthParam}-01T00:00:00`) : startOfDay(new Date());
  const year = base.getFullYear();
  const month = base.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);

  try {
    const rooms = await prisma.room.findMany({
      where: { isActive: true },
      include: {
        bookings: {
          where: {
            paymentStatus: { in: ["PAID", "PENDING"] },
            checkIn: { lt: end },
            checkOut: { gt: start },
          },
        },
        priceOverrides: {
          where: { date: { gte: start, lt: end } },
        },
        icalFeeds: true,
      },
      orderBy: { basePrice: "desc" },
    });

    const days = eachNight(start, end).map((date) => toDateKey(date));

  const payload = rooms.map((room) => {
    const occupancy: Record<
      string,
      { status: "available" | "booked" | "pending" | "blocked"; bookingId?: string; source?: string; guestName?: string }
    > = {};

    for (const day of days) {
      occupancy[day] = { status: "available" };
    }

    for (const booking of room.bookings) {
      for (const night of eachNight(booking.checkIn, booking.checkOut)) {
        const key = toDateKey(night);
        if (!occupancy[key]) continue;
        occupancy[key] = {
          status:
            booking.source === "MANUAL" && booking.totalAmount === 0
              ? "blocked"
              : booking.paymentStatus === "PENDING"
                ? "pending"
                : "booked",
          bookingId: booking.id,
          source: booking.source,
          guestName: booking.guestName,
        };
      }
    }

    const prices: Record<string, number> = {};
    for (const day of days) {
      const quote = quoteStay(room.basePrice, new Date(day), addDays(new Date(day), 1), room.priceOverrides);
      prices[day] = quote.totalAmount;
    }

    return {
      id: room.id,
      name: room.name,
      slug: room.slug,
      basePrice: room.basePrice,
      occupancy,
      prices,
      overrides: room.priceOverrides.map((item) => ({
        id: item.id,
        date: toDateKey(item.date),
        customPrice: item.customPrice,
        note: item.note,
      })),
      icalFeeds: room.icalFeeds.map((feed) => ({
        id: feed.id,
        otaName: feed.otaName,
        importUrl: feed.importUrl,
        lastSyncedAt: feed.lastSyncedAt,
        lastError: feed.lastError,
      })),
    };
  });

    return NextResponse.json({
      month: `${year}-${String(month + 1).padStart(2, "0")}`,
      days,
      rooms: payload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load calendar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
