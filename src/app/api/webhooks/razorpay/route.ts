import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBookingConfirmation } from "@/lib/whatsapp";
import { notifyFailure } from "@/lib/alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function markPaid(orderId?: string, paymentId?: string) {
  if (!orderId && !paymentId) return null;

  const booking = await prisma.booking.findFirst({
    where: {
      OR: [
        orderId ? { razorpayOrderId: orderId } : undefined,
        paymentId ? { razorpayPaymentId: paymentId } : undefined,
      ].filter(Boolean) as { razorpayOrderId?: string; razorpayPaymentId?: string }[],
    },
    include: { room: true },
  });

  if (!booking) return null;
  if (booking.paymentStatus === "PAID") return booking;

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      paymentStatus: "PAID",
      razorpayPaymentId: paymentId ?? booking.razorpayPaymentId,
      razorpayOrderId: orderId ?? booking.razorpayOrderId,
    },
    include: { room: true },
  });

  const whatsapp = await sendBookingConfirmation({
    guestName: updated.guestName,
    guestPhone: updated.guestPhone,
    bookingNumber: updated.bookingNumber,
    checkIn: updated.checkIn,
    checkOut: updated.checkOut,
    roomName: updated.room.name,
    totalAmount: updated.totalAmount,
    depositAmount: updated.depositAmount,
    balanceDue: updated.balanceDue,
  });
  return prisma.booking.update({
    where: { id: updated.id },
    data: {
      whatsappSentAt: whatsapp.sent ? new Date() : null,
      whatsappError: whatsapp.error ?? null,
    },
    include: { room: true },
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    // Only alert when a signature header was actually present but didn't
    // match — that suggests a real misconfiguration, not random bot traffic.
    if (signature) {
      notifyFailure(
        "Razorpay webhook signature mismatch",
        "A webhook call had a signature that didn't match — check RAZORPAY_WEBHOOK_SECRET matches the one saved in Razorpay's dashboard webhook settings.",
      ).catch(() => {});
    }
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as {
      event?: string;
      payload?: {
        payment?: { entity?: { id?: string; order_id?: string; status?: string } };
        order?: { entity?: { id?: string; status?: string } };
      };
    };

    const event = payload.event ?? "";
    const payment = payload.payload?.payment?.entity;
    const order = payload.payload?.order?.entity;

    if (event === "payment.captured" || event === "order.paid") {
      await markPaid(payment?.order_id ?? order?.id, payment?.id);
    }

    if (event === "payment.failed") {
      if (payment?.order_id) {
        const failedBooking = await prisma.booking.findFirst({
          where: { razorpayOrderId: payment.order_id, paymentStatus: "PENDING" },
          include: { room: true },
        });
        await prisma.booking.updateMany({
          where: { razorpayOrderId: payment.order_id, paymentStatus: "PENDING" },
          data: { paymentStatus: "FAILED" },
        });
        if (failedBooking) {
          notifyFailure(
            "Guest payment failed",
            `Booking ${failedBooking.bookingNumber} for ${failedBooking.room.name} did not go through. Guest: ${failedBooking.guestName} (${failedBooking.guestPhone}).`,
          ).catch(() => {});
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    console.error("razorpay webhook failed", error);
    notifyFailure("Razorpay webhook error", message).catch(() => {});
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
