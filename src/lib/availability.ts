import { Booking, PaymentStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { addDays, eachNight, parseDateKey, startOfDay, toDateKey } from "./utils";

const BLOCKING_STATUSES: PaymentStatus[] = ["PAID", "PENDING"];

export async function expireStalePendingBookings() {
  const cutoff = new Date(Date.now() - 20 * 60 * 1000);
  await prisma.booking.updateMany({
    where: {
      paymentStatus: "PENDING",
      createdAt: { lt: cutoff },
    },
    data: { paymentStatus: "FAILED" },
  });
}

export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
) {
  return startOfDay(aStart) < startOfDay(bEnd) && startOfDay(bStart) < startOfDay(aEnd);
}

export async function getBlockingBookings(roomId: string, from: Date, to: Date) {
  return prisma.booking.findMany({
    where: {
      roomId,
      paymentStatus: { in: BLOCKING_STATUSES },
      checkIn: { lt: to },
      checkOut: { gt: from },
    },
    select: {
      id: true,
      checkIn: true,
      checkOut: true,
      source: true,
      paymentStatus: true,
      guestName: true,
    },
  });
}

export function bookedNightKeys(bookings: Pick<Booking, "checkIn" | "checkOut">[]) {
  const keys = new Set<string>();
  for (const booking of bookings) {
    for (const night of eachNight(booking.checkIn, booking.checkOut)) {
      keys.add(toDateKey(night));
    }
  }
  return keys;
}

export async function isRoomAvailable(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  ignoreBookingId?: string,
) {
  await expireStalePendingBookings();
  const conflict = await prisma.booking.findFirst({
    where: {
      roomId,
      paymentStatus: { in: BLOCKING_STATUSES },
      id: ignoreBookingId ? { not: ignoreBookingId } : undefined,
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
    select: { id: true, source: true, bookingNumber: true },
  });

  return { available: !conflict, conflict };
}

export async function getOccupiedDates(roomId: string, monthsAhead = 12) {
  await expireStalePendingBookings();
  const from = startOfDay(new Date());
  const to = addDays(from, monthsAhead * 31);
  const bookings = await getBlockingBookings(roomId, from, to);
  return Array.from(bookedNightKeys(bookings));
}

export function parseStayDates(checkIn: string, checkOut: string) {
  const start = parseDateKey(checkIn);
  const end = parseDateKey(checkOut);
  if (!start || !end) {
    throw new Error("Invalid check-in or check-out date.");
  }
  if (end <= start) {
    throw new Error("Check-out must be after check-in.");
  }
  const today = startOfDay(new Date());
  if (start < today) {
    throw new Error("Check-in cannot be in the past.");
  }
  return { checkIn: start, checkOut: end };
}
