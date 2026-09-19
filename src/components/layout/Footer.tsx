import Link from "next/link";
import { PROPERTY } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-secondary text-secondary-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <p className="font-serif text-2xl">{PROPERTY.name}</p>
          <p className="mt-2 text-sm text-white/70">{PROPERTY.address}</p>
        </div>
        <div className="text-sm text-white/80">
          <p>Check-in {PROPERTY.checkIn}</p>
          <p>Check-out {PROPERTY.checkOut}</p>
          <p className="mt-2">WhatsApp {PROPERTY.phone}</p>
          <p className="mt-2">Direct booking · UPI & cards · iCal synced</p>
        </div>
        <div className="text-sm">
          <Link className="underline underline-offset-4" href={PROPERTY.mapsUrl} target="_blank">
            Google Maps directions
          </Link>
          <p className="mt-2 text-white/70">Taxi from Baijnath · paragliding in Billing on request.</p>
          <p className="mt-2">
            <Link className="underline underline-offset-4" href="/manage-booking">
              Manage or cancel your booking
            </Link>
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-2xl space-y-2 px-4 pb-8">
        {PROPERTY.developerNote.split("\n\n").map((paragraph, index) => (
          <p
            key={index}
            className={
              index === 0
                ? "border-t border-white/10 pt-6 text-center text-xs italic text-white/50"
                : "text-center text-xs italic text-white/50"
            }
          >
            {paragraph}
          </p>
        ))}
      </div>
    </footer>
  );
}
