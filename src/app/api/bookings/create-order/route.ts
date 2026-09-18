import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRoomAvailable, parseStayDates } from "@/lib/availability";
import { quoteStay, splitDeposit } from "@/lib/pricing";
import { generateBookingNumber, normalizePhone } from "@/lib/utils";
import { createOrderSchema } from "@/lib/validations";
import { getRazorpay, rupeesToPaise } from "@/lib/razorpay";
import { getDepositPercent } from "@/lib/settings";
import { notifyFailure } from "@/lib/alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = createOrderSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { checkIn, checkOut } = parseStayDates(parsed.data.checkIn, parsed.data.checkOut);
    const room = await prisma.room.findUnique({
      where: { id: parsed.data.roomId },
      include: {
        priceOverrides: {
          where: { date: { gte: checkIn, lt: checkOut } },
        },
      },
    });

    if (!room || !room.isActive) {
      return NextResponse.json({ error: "Room is not available." }, { status: 404 });
    }

    if (parsed.data.guests > room.maxGuests) {
      return NextResponse.json(
        { error: `This room sleeps up to ${room.maxGuests} guests.` },
        { status: 400 },
      );
    }

    const { available, conflict } = await isRoomAvailable(room.id, checkIn, checkOut);
    if (!available) {
      return NextResponse.json(
        {
          error: "Those dates were just booked. Please pick another stay.",
          conflictSource: conflict?.source ?? null,
        },
        { status: 409 },
      );
    }

    const quote = quoteStay(room.basePrice, checkIn, checkOut, room.priceOverrides);
    const depositPercent = await getDepositPercent();
    const { depositAmount, balanceDue } = splitDeposit(quote.totalAmount, depositPercent);
    const bookingNumber = generateBookingNumber();
    const razorpay = getRazorpay();

    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        roomId: room.id,
        guestName: parsed.data.guestName.trim(),
        guestPhone: normalizePhone(parsed.data.guestPhone),
        guestEmail: parsed.data.guestEmail.toLowerCase(),
        guestCount: parsed.data.guests,
        checkIn,
        checkOut,
        totalAmount: quote.totalAmount,
        depositAmount,
        balanceDue,
        paymentStatus: "PENDING",
        source: "DIRECT",
      },
    });

    const order = await razorpay.orders.create({
      amount: rupeesToPaise(depositAmount),
      currency: "INR",
      receipt: bookingNumber,
      notes: {
        bookingId: booking.id,
        bookingNumber,
        roomId: room.id,
        roomName: room.name,
        totalAmount: quote.totalAmount,
        depositAmount,
        balanceDue,
      },
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { razorpayOrderId: order.id },
    });

    return NextResponse.json({
      bookingId: booking.id,
      bookingNumber,
      amount: depositAmount,
      totalAmount: quote.totalAmount,
      balanceDue,
      depositPercent,
      nights: quote.nights,
      breakdown: quote.breakdown,
      razorpayOrderId: order.id,
      razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      room: { id: room.id, name: room.name, slug: room.slug },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create payment order";
    console.error("create-order failed", error);
    notifyFailure("Booking checkout failed", message).catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
