import Link from "next/link";
import { PROPERTY } from "@/lib/constants";

export default function BookingSuccessPage({
  searchParams,
}: {
  searchParams: { ref?: string };
}) {
  const ref = searchParams.ref;
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
          Booking ID {ref ?? "is on its way"}. A WhatsApp confirmation is sent to you and to the homestay after WhatsApp
          is connected. You can also message the owner now.
        </p>
        <p className="mt-3 text-sm">
          Check-in {PROPERTY.checkIn} · Check-out {PROPERTY.checkOut}
        </p>
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
      </div>
    </main>
  );
}
