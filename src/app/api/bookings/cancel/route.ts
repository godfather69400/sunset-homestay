import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingCancelSchema } from "@/lib/validations";
import { getCancellationPolicy } from "@/lib/settings";
import { computeCancellationRefund } from "@/lib/pricing";
import { normalizePhone } from "@/lib/utils";
import { getRazorpay, rupeesToPaise } from "@/lib/razorpay";
import { formatCancellationMessage, formatOwnerCancellationMessage, ownerWhatsAppNumber, sendWhatsApp } from "@/lib/whatsapp";
import { notifyFailure } from "@/lib/alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public — a guest can cancel their own direct booking with their booking
// number + phone number. Applies the owner's cancellation policy, attempts an
// automatic Razorpay refund when money was actually charged, and always frees
// the room on the calendar even if the automatic refund fails (the owner is
// alerted to refund manually in that case).
export async function POST(request: Request) {
  const parsed = bookingCancelSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your booking ID and phone number." }, { status: 400 });
  }

  const { bookingNumber, guestPhone } = parsed.data;
  const booking = await prisma.booking.findFirst({
    where: { bookingNumber: bookingNumber.trim().toUpperCase(), source: "DIRECT" },
    include: { room: { select: { name: true } } },
  });

  const phoneDigits = normalizePhone(guestPhone).replace(/\D/g, "").slice(-10);
  if (!booking || normalizePhone(booking.guestPhone).replace(/\D/g, "").slice(-10) !== phoneDigits) {
    return NextResponse.json(
      { error: "We couldn't find a booking with that ID and phone number." },
      { status: 404 },
    );
  }

  if (booking.paymentStatus === "CANCELLED") {
    return NextResponse.json({ error: "This booking is already cancelled." }, { status: 400 });
  }
  if (booking.paymentStatus === "FAILED") {
    return NextResponse.json({ error: "This booking was never confirmed, so there is nothing to cancel." }, { status: 400 });
  }

  const policy = await getCancellationPolicy();
  const amountPaid = booking.depositAmount || booking.totalAmount;
  let refundAmount = 0;
  let refundedAutomatically = false;

  if (booking.paymentStatus === "PAID") {
    const refund = computeCancellationRefund(amountPaid, booking.checkIn, policy);
    refundAmount = refund.refundAmount;

    if (refundAmount > 0 && booking.razorpayPaymentId) {
      try {
        await getRazorpay().payments.refund(booking.razorpayPaymentId, {
          amount: rupeesToPaise(refundAmount),
          speed: "normal",
        });
        refundedAutomatically = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Refund API call failed";
        console.error("Automatic refund failed", booking.bookingNumber, message);
        notifyFailure(
          `Manual refund needed — ${booking.bookingNumber}`,
          `Guest cancelled ${booking.room.name} (${booking.guestName}, ${booking.guestPhone}). Auto-refund of ₹${refundAmount} failed: ${message}. Please refund manually via UPI.`,
        ).catch(() => {});
      }
    }
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      paymentStatus: "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy: "GUEST",
      refundAmount,
      notes: [booking.notes, `Cancelled by guest. Refund: ₹${refundAmount}${refundedAutomatically ? " (auto)" : refundAmount > 0 ? " (manual — pending)" : ""}.`]
        .filter(Boolean)
        .join(" | "),
    },
  });

  const messageInput = {
    guestName: booking.guestName,
    guestPhone: booking.guestPhone,
    bookingNumber: booking.bookingNumber,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    roomName: booking.room.name,
    refundAmount,
    refundedAutomatically,
  };

  try {
    await sendWhatsApp(normalizePhone(booking.guestPhone), formatCancellationMessage(messageInput));
  } catch (error) {
    console.error("Cancellation WhatsApp to guest failed", error);
  }
  try {
    await sendWhatsApp(ownerWhatsAppNumber(), formatOwnerCancellationMessage(messageInput));
  } catch (error) {
    console.error("Cancellation WhatsApp to owner failed", error);
  }

  return NextResponse.json({
    ok: true,
    refundAmount,
    refundedAutomatically,
    paymentStatus: updated.paymentStatus,
  });
}
