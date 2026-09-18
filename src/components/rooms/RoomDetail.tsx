"use client";

import Image from "next/image";
import { useState } from "react";
import { BookingModal } from "@/components/booking/BookingModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatInr } from "@/lib/utils";
import type { PublicRoom } from "@/lib/rooms";
import { PROPERTY } from "@/lib/constants";

export function RoomDetail({ room }: { room: PublicRoom }) {
  const [open, setOpen] = useState(false);

  return (
    <main className="pt-24">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-20 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="relative aspect-[16/10] overflow-hidden rounded-3xl">
            <Image src={room.images[0]} alt={room.name} fill className="object-cover" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {room.images.slice(1, 3).map((src) => (
              <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                <Image src={src} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border bg-card p-6 shadow-soft">
          <p className="text-sm uppercase tracking-[0.2em] text-primary">{room.viewType}</p>
          <h1 className="mt-2 font-serif text-4xl">{room.name}</h1>
          <p className="mt-3 text-muted-foreground">{room.description}</p>
          <p className="mt-4 font-serif text-3xl">
            {formatInr(room.basePrice)} <span className="text-base font-sans text-muted-foreground">/ night</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {room.bedType} · up to {room.maxGuests} guests
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {room.amenities.map((amenity) => (
              <Badge key={amenity}>{amenity}</Badge>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Check-in {PROPERTY.checkIn} · Check-out {PROPERTY.checkOut}
          </p>
          <Button className="mt-6 w-full" size="lg" onClick={() => setOpen(true)}>
            Book this room
          </Button>
        </div>
      </div>
      <BookingModal room={room} open={open} onOpenChange={setOpen} />
    </main>
  );
}
