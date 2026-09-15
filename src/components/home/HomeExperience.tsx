"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { RoomCard } from "@/components/rooms/RoomCard";
import { BookingModal } from "@/components/booking/BookingModal";
import { Wifi, Flame, Car, UtensilsCrossed, Laptop, Sunset } from "lucide-react";
import type { PublicRoom } from "@/lib/rooms";
import { PROPERTY } from "@/lib/constants";

const AMENITY_ICONS = [
  { icon: Wifi, label: "High-speed Wi-Fi" },
  { icon: Flame, label: "24-hr Hot Water / Geyser" },
  { icon: Sunset, label: "Mountain View Balcony" },
  { icon: UtensilsCrossed, label: "Homemade Himachali Food" },
  { icon: Car, label: "Free Parking" },
  { icon: Laptop, label: "Workstation" },
];

export function HomeExperience({
  rooms,
  checkIn,
  checkOut,
  guests,
}: {
  rooms: PublicRoom[];
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}) {
  const [selected, setSelected] = useState<PublicRoom | null>(null);
  const sorted = useMemo(() => rooms, [rooms]);

  return (
    <>
      <section className="mx-auto mt-16 max-w-6xl px-4">
        <p className="text-sm uppercase tracking-[0.2em] text-primary">From the house in Vill Kotli</p>
        <h2 className="mt-2 font-serif text-3xl">The actual sunset, balcony and hillside</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          {PROPERTY.gallery.map((src, index) => (
            <div
              key={src}
              className={`relative overflow-hidden rounded-2xl ${index === 0 ? "col-span-2 aspect-[16/9]" : "aspect-[4/3]"}`}
            >
              <Image
                src={src}
                alt="Sunset Point Homestay, Bir"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          ))}
        </div>
      </section>

      <section id="stay" className="mx-auto mt-16 max-w-6xl px-4">
        <div className="grid gap-6 md:grid-cols-3">
          {AMENITY_ICONS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-sm">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="rooms" className="mx-auto mt-16 max-w-6xl px-4">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm uppercase tracking-[0.2em] text-primary">Four rooms</p>
          <h2 className="mt-2 font-serif text-4xl">Stay above Bir, looking at the Dhauladhar</h2>
          <p className="mt-3 text-muted-foreground">
            Photos are from this house — the sunset balcony, forest sit-outs and family terrace in Vill Kotli. Rates move for weekends and paragliding weeks.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {sorted.map((room) => (
            <RoomCard key={room.id} room={room} onBook={setSelected} />
          ))}
        </div>
      </section>

      <BookingModal
        room={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        initialCheckIn={checkIn}
        initialCheckOut={checkOut}
        initialGuests={guests}
      />
    </>
  );
}
