import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bookingUpdateSchema } from "@/lib/validations";
import { toDateKey } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Payments only lists bookings taken directly on this site (plus real,
    // charged walk-ins entered by the owner). OTA-imported holds are shown as
    // calendar metadata instead — see the Calendar tab.
    const bookings = await prisma.booking.findMany({
      where: { source: "DIRECT" },
      include: { room: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 120,
    });

    const manualBlocks = await prisma.booking.findMany({
      where: { source: "MANUAL", totalAmount: { gt: 0 } },
      include: { room: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    });

    return NextResponse.json({
      bookings: [...bookings, ...manualBlocks]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 120)
        .map((booking) => ({
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          guestName: booking.guestName,
          guestPhone: booking.guestPhone,
          guestEmail: booking.guestEmail,
          guestCount: booking.guestCount,
          checkIn: toDateKey(booking.checkIn),
          checkOut: toDateKey(booking.checkOut),
          totalAmount: booking.totalAmount,
          depositAmount: booking.depositAmount,
          balanceDue: booking.balanceDue,
          paymentStatus: booking.paymentStatus,
          source: booking.source,
          razorpayOrderId: booking.razorpayOrderId,
          razorpayPaymentId: booking.razorpayPaymentId,
          notes: booking.notes,
          whatsappSentAt: booking.whatsappSentAt,
          whatsappError: booking.whatsappError,
          cancelledAt: booking.cancelledAt,
          cancelledBy: booking.cancelledBy,
          refundAmount: booking.refundAmount,
          createdAt: booking.createdAt,
          roomName: booking.room.name,
          roomSlug: booking.room.slug,
        })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load bookings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bookingUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id, ...data } = parsed.data;
  const booking = await prisma.booking.update({
    where: { id },
    data: {
      ...(data.paymentStatus ? { paymentStatus: data.paymentStatus } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.razorpayPaymentId ? { razorpayPaymentId: data.razorpayPaymentId } : {}),
      ...(data.totalAmount !== undefined ? { totalAmount: data.totalAmount } : {}),
      ...(data.guestName ? { guestName: data.guestName } : {}),
      ...(data.guestPhone ? { guestPhone: data.guestPhone } : {}),
    },
  });

  return NextResponse.json({ ok: true, booking });
}
