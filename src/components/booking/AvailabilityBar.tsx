"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/booking/DateRangePicker";

type AvailabilityBarProps = {
  defaultCheckIn?: string;
  defaultCheckOut?: string;
  defaultGuests?: number;
};

export function AvailabilityBar({
  defaultCheckIn,
  defaultCheckOut,
  defaultGuests = 2,
}: AvailabilityBarProps) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const [guests, setGuests] = useState(defaultGuests);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onCheck() {
    if (!checkIn || !checkOut) {
      setMessage("Pick check-in and check-out dates first.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/bookings/availability?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not check availability");
      const open = (data.results ?? []).filter((item: { available: boolean }) => item.available);
      if (!open.length) {
        setMessage("No rooms free for those dates. Try another range or WhatsApp us.");
        return;
      }
      router.push(`/?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}#rooms`);
      setMessage(`${open.length} room${open.length > 1 ? "s" : ""} available — scroll to book.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Availability check failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative z-20 mx-auto -mt-10 w-[calc(100%-1.5rem)] max-w-5xl rounded-3xl border bg-card/95 p-4 shadow-soft backdrop-blur md:-mt-12 md:p-5">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="md:col-span-2">
          <Label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
            Check-in / Check-out
          </Label>
          <DateRangePicker
            checkIn={checkIn}
            checkOut={checkOut}
            numberOfMonths={1}
            onChange={(range) => {
              setCheckIn(range.checkIn);
              setCheckOut(range.checkOut);
            }}
          />
        </div>
        <div>
          <Label htmlFor="guests" className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
            Guests
          </Label>
          <Input
            id="guests"
            type="number"
            min={1}
            max={8}
            value={guests}
            onChange={(event) => setGuests(Number(event.target.value))}
            className="h-12 rounded-2xl"
          />
        </div>
        <div className="flex items-end">
          <Button className="h-12 w-full" onClick={onCheck} disabled={loading}>
            {loading ? "Checking…" : "Check Availability"}
          </Button>
        </div>
      </div>
      {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
    </section>
  );
}
