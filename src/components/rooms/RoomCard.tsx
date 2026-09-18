"use client";

import Image from "next/image";
import Link from "next/link";
import { Mountain, Users, BedDouble } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatInr } from "@/lib/utils";
import type { PublicRoom } from "@/lib/rooms";

type RoomCardProps = {
  room: PublicRoom;
  onBook?: (room: PublicRoom) => void;
};

export function RoomCard({ room, onBook }: RoomCardProps) {
  return (
    <article className="overflow-hidden rounded-3xl border bg-card shadow-soft">
      <div className="relative aspect-[16/11]">
        <Image
          src={room.images[0]}
          alt={room.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        <div className="absolute left-4 top-4">
          <Badge className="bg-card/90 backdrop-blur">{room.viewType}</Badge>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <h3 className="font-serif text-2xl leading-tight">{room.name}</h3>
          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{room.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BedDouble className="h-3.5 w-3.5" /> {room.bedType}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> {room.maxGuests} guests
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {room.amenities.slice(0, 4).map((amenity) => (
            <Badge key={amenity} className="bg-muted text-muted-foreground">
              {amenity}
            </Badge>
          ))}
        </div>
        <div className="flex items-end justify-between gap-3 border-t pt-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">From</p>
            <p className="font-serif text-2xl">{formatInr(room.basePrice)}</p>
            <p className="text-xs text-muted-foreground">per night</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={() => onBook?.(room)}>Book now</Button>
            <Button variant="outline" asChild>
              <Link href={`/rooms/${room.slug}`}>
                <Mountain className="mr-1.5 h-4 w-4" />
                Details
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
