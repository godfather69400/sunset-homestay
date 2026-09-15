import Link from "next/link";
import { PROPERTY } from "@/lib/constants";

export default function BookingSuccessPage({
  searchParams,
}: {
  searchParams: { ref?: string };
}) {
  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4 pt-24">
      <div className="max-w-lg rounded-3xl border bg-card p-8 text-center shadow-soft">
        <p className="text-sm uppercase tracking-[0.2em] text-primary">Confirmed</p>
        <h1 className="mt-3 font-serif text-4xl">Namaste, your stay is booked</h1>
        <p className="mt-4 text-muted-foreground">
          Booking ID {searchParams.ref ?? "is on its way"}. A WhatsApp confirmation is being sent with directions to {PROPERTY.name}.
        </p>
        <p className="mt-3 text-sm">
          Check-in {PROPERTY.checkIn} · Check-out {PROPERTY.checkOut}
        </p>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm text-primary-foreground">
          Back to rooms
        </Link>
      </div>
    </main>
  );
}
