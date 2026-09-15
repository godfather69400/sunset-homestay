import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRoomAvailable, parseStayDates } from "@/lib/availability";
import { quoteStay } from "@/lib/pricing";
import { generateBookingNumber, normalizePhone } from "@/lib/utils";
import { createOrderSchema } from "@/lib/validations";
import { getRazorpay, rupeesToPaise } from "@/lib/razorpay";

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
        paymentStatus: "PENDING",
        source: "DIRECT",
      },
    });

    const order = await razorpay.orders.create({
      amount: rupeesToPaise(quote.totalAmount),
      currency: "INR",
      receipt: bookingNumber,
      notes: {
        bookingId: booking.id,
        bookingNumber,
        roomId: room.id,
        roomName: room.name,
      },
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { razorpayOrderId: order.id },
    });

    return NextResponse.json({
      bookingId: booking.id,
      bookingNumber,
      amount: quote.totalAmount,
      nights: quote.nights,
      breakdown: quote.breakdown,
      razorpayOrderId: order.id,
      razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      room: { id: room.id, name: room.name, slug: room.slug },
    });
  } catch (error) {
    console.error("create-order failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create payment order" },
      { status: 500 },
    );
  }
}
