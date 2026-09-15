import Image from "next/image";
import { MapPin } from "lucide-react";
import { PROPERTY } from "@/lib/constants";

export function Hero() {
  return (
    <section className="relative isolate min-h-[88vh] overflow-hidden">
      <Image
        src={PROPERTY.heroImage}
        alt="Sunset over Vill Kotli from Sunset Point Homestay, Bir"
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      <div className="hero-overlay absolute inset-0" />
      <div className="relative mx-auto flex min-h-[88vh] max-w-6xl flex-col justify-end px-4 pb-28 pt-28 text-white md:pb-32">
        <p className="mb-3 inline-flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-white/80">
          <MapPin className="h-4 w-4" />
          {PROPERTY.area}, {PROPERTY.location}
        </p>
        <h1 className="max-w-3xl font-serif text-4xl leading-tight md:text-6xl">
          {PROPERTY.name}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-white/90 md:text-xl">{PROPERTY.tagline}</p>
        <p className="mt-6 max-w-xl text-sm text-white/75">
          Four cozy rooms above Bir. Direct UPI booking, no OTA commission, and calendars synced with MakeMyTrip and Airbnb so you never double-book.
        </p>
      </div>
    </section>
  );
}
