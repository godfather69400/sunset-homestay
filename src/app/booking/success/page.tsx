import Link from "next/link";
import { PROPERTY } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatDisplayDate, formatInr } from "@/lib/utils";

async function getBookingDetails(bookingNumber: string) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { bookingNumber },
      include: { room: { select: { name: true } } },
    });
    return booking;
  } catch (error) {
    console.warn("Could not load booking for success page", error);
    return null;
  }
}

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }> | { ref?: string };
}) {
  const resolved = await searchParams;
  const ref = resolved.ref;
  const booking = ref ? await getBookingDetails(ref) : null;

  const ownerChat = `https://wa.me/${PROPERTY.phoneDigits}?text=${encodeURIComponent(
    ref
      ? `Namaste, my booking ${ref} at Sunset Point Homestay is paid. Please confirm check-in details.`
      : PROPERTY.whatsappPrefill,
  )}`;

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4 pt-24">
      <div className="max-w-lg rounded-3xl border bg-card p-8 text-center shadow-soft">
        <p className="text-sm uppercase tracking-[0.2em] text-primary">Confirmed</p>
        <h1 className="mt-3 font-serif text-4xl">Namaste, your stay is booked</h1>
        <p className="mt-4 text-muted-foreground">
          Booking ID <span className="font-medium text-foreground">{ref ?? "is on its way"}</span>. A WhatsApp
          confirmation is sent to you and to the homestay once WhatsApp is connected. You can also message the owner
          now.
        </p>

        {booking ? (
          <div className="mt-6 space-y-2 rounded-2xl border bg-muted/40 p-5 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Room</span>
              <span className="font-medium">{booking.room.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Check-in</span>
              <span className="font-medium">
                {formatDisplayDate(booking.checkIn)} ({PROPERTY.checkIn})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Check-out</span>
              <span className="font-medium">
                {formatDisplayDate(booking.checkOut)} ({PROPERTY.checkOut})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Guests</span>
              <span className="font-medium">{booking.guestCount}</span>
            </div>
            <div className="mt-2 border-t pt-2 flex justify-between">
              <span className="text-muted-foreground">Total stay cost</span>
              <span className="font-medium">{formatInr(booking.totalAmount)}</span>
            </div>
            {booking.balanceDue > 0 ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid now (advance)</span>
                  <span className="font-medium">{formatInr(booking.depositAmount)}</span>
                </div>
                <div className="flex justify-between text-primary">
                  <span>Balance due at check-in</span>
                  <span className="font-medium">{formatInr(booking.balanceDue)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-primary">
                <span>Amount paid</span>
                <span className="font-medium">{formatInr(booking.depositAmount || booking.totalAmount)}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm">
            Check-in {PROPERTY.checkIn} · Check-out {PROPERTY.checkOut}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            href={ownerChat}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full bg-[#25D366] px-5 py-3 text-sm font-medium text-white"
          >
            WhatsApp the homestay
          </a>
          <Link href="/" className="inline-flex rounded-full bg-primary px-5 py-3 text-sm text-primary-foreground">
            Back to rooms
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Plans changed?{" "}
          <Link href={`/manage-booking${ref ? `?ref=${ref}` : ""}`} className="underline underline-offset-4">
            Manage or cancel this booking
          </Link>
        </p>
      </div>
    </main>
  );
}
