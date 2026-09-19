import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingLookupSchema } from "@/lib/validations";
import { getCancellationPolicy } from "@/lib/settings";
import { computeCancellationRefund } from "@/lib/pricing";
import { normalizePhone, toDateKey } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public — lets a guest pull up their own direct booking with their booking
// number + the phone number they booked with. No admin session required, but
// both fields must match so a stranger can't browse other guests' bookings.
export async function POST(request: Request) {
  const parsed = bookingLookupSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your booking ID and phone number." }, { status: 400 });
  }

  const { bookingNumber, guestPhone } = parsed.data;
  const booking = await prisma.booking.findFirst({
    where: { bookingNumber: bookingNumber.trim().toUpperCase(), source: "DIRECT" },
    include: { room: { select: { name: true, slug: true } } },
  });

  const phoneDigits = normalizePhone(guestPhone).replace(/\D/g, "").slice(-10);
  if (!booking || normalizePhone(booking.guestPhone).replace(/\D/g, "").slice(-10) !== phoneDigits) {
    return NextResponse.json(
      { error: "We couldn't find a booking with that ID and phone number." },
      { status: 404 },
    );
  }

  const policy = await getCancellationPolicy();
  const amountPaid = booking.depositAmount || booking.totalAmount;
  const refundPreview =
    booking.paymentStatus === "PAID"
      ? computeCancellationRefund(amountPaid, booking.checkIn, policy)
      : null;

  return NextResponse.json({
    booking: {
      bookingNumber: booking.bookingNumber,
      roomName: booking.room.name,
      checkIn: toDateKey(booking.checkIn),
      checkOut: toDateKey(booking.checkOut),
      guestCount: booking.guestCount,
      totalAmount: booking.totalAmount,
      depositAmount: booking.depositAmount,
      balanceDue: booking.balanceDue,
      paymentStatus: booking.paymentStatus,
      cancelledAt: booking.cancelledAt,
      refundAmount: booking.refundAmount,
    },
    policy,
    refundPreview,
    canCancel: booking.paymentStatus === "PAID" || booking.paymentStatus === "PENDING",
  });
}
