"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/booking/DateRangePicker";
import { formatInr } from "@/lib/utils";
import { splitDeposit } from "@/lib/pricing";
import { PROPERTY } from "@/lib/constants";
import type { PublicRoom } from "@/lib/rooms";

const guestSchema = z.object({
  guestName: z.string().min(2, "Please enter your name"),
  guestPhone: z.string().min(10, "Enter a valid phone"),
  guestEmail: z.string().email("Enter a valid email"),
  guests: z.coerce.number().min(1).max(8),
});

type GuestForm = z.infer<typeof guestSchema>;

type QuoteNight = { date: string; amount: number; weekend: boolean; overridden: boolean };

type BookingModalProps = {
  room: PublicRoom | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpay() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay"));
    document.body.appendChild(script);
  });
}

export function BookingModal({
  room,
  open,
  onOpenChange,
  initialCheckIn,
  initialCheckOut,
  initialGuests = 2,
}: BookingModalProps) {
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [quote, setQuote] = useState<{ totalAmount: number; nights: number; breakdown: QuoteNight[] } | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [depositPercent, setDepositPercent] = useState(100);
  const [cancellationPolicy, setCancellationPolicy] = useState<{
    freeCancellationDays: number;
    cancellationFeePercent: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.depositPercent === "number") setDepositPercent(data.depositPercent);
        if (typeof data.freeCancellationDays === "number" && typeof data.cancellationFeePercent === "number") {
          setCancellationPolicy({
            freeCancellationDays: data.freeCancellationDays,
            cancellationFeePercent: data.cancellationFeePercent,
          });
        }
      })
      .catch(() => {});
  }, []);

  const form = useForm<GuestForm>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      guestName: "",
      guestPhone: "",
      guestEmail: "",
      guests: initialGuests,
    },
  });
  const guests = form.watch("guests");

  useEffect(() => {
    setCheckIn(initialCheckIn);
    setCheckOut(initialCheckOut);
  }, [initialCheckIn, initialCheckOut, room?.id]);

  useEffect(() => {
    if (!room || room.id.startsWith("fallback-")) return;
    fetch(`/api/rooms/${room.slug}/occupied`)
      .then((res) => res.json())
      .then((data) => setBookedDates(data.dates ?? []))
      .catch(() => setBookedDates([]));
  }, [room]);

  useEffect(() => {
    if (!room || !checkIn || !checkOut || room.id.startsWith("fallback-")) {
      setQuote(null);
      setAvailable(null);
      return;
    }

    fetch(`/api/bookings/availability?roomId=${room.id}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`)
      .then((res) => res.json())
      .then((data) => {
        const result = data.results?.[0];
        setAvailable(result?.available ?? false);
        if (result) {
          setQuote({
            totalAmount: result.totalAmount,
            nights: result.nights,
            breakdown: result.breakdown,
          });
        }
      })
      .catch(() => setAvailable(false));
  }, [room, checkIn, checkOut, guests]);

  const canPay = useMemo(
    () => Boolean(room && checkIn && checkOut && available && quote && quote.nights > 0),
    [room, checkIn, checkOut, available, quote],
  );

  async function onSubmit(values: GuestForm) {
    if (!room || !checkIn || !checkOut) return;
    if (room.id.startsWith("fallback-")) {
      toast.error("Connect Supabase and seed rooms before taking live bookings.");
      return;
    }

    setSubmitting(true);
    try {
      await loadRazorpay();
      const response = await fetch("/api/bookings/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room.id,
          checkIn,
          checkOut,
          ...values,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not start checkout");
      }

      const razorpay = new window.Razorpay!({
        key: data.razorpayKeyId,
        amount: data.amount * 100,
        currency: "INR",
        name: PROPERTY.name,
        description:
          data.balanceDue > 0
            ? `${room.name} · ${data.nights} night(s) · advance payment`
            : `${room.name} · ${data.nights} night(s)`,
        order_id: data.razorpayOrderId,
        prefill: {
          name: values.guestName,
          email: values.guestEmail,
          contact: values.guestPhone,
        },
        theme: { color: "#C45C26" },
        handler: async (payment: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verify = await fetch("/api/bookings/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payment),
          });
          const verified = await verify.json();
          if (!verify.ok) {
            toast.error(verified.error ?? "Payment captured but confirmation is pending.");
            return;
          }
          window.location.href = `/booking/success?ref=${verified.bookingNumber}`;
        },
      });
      razorpay.open();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book {room?.name ?? "your stay"}</DialogTitle>
          <DialogDescription>
            Direct UPI / card checkout. Dates blocked instantly after payment so OTAs cannot double-book.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <Label>Stay dates</Label>
            <div className="mt-2">
              <DateRangePicker
                checkIn={checkIn}
                checkOut={checkOut}
                bookedDates={bookedDates}
                numberOfMonths={1}
                onChange={(range) => {
                  setCheckIn(range.checkIn);
                  setCheckOut(range.checkOut);
                }}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="guestName">Full name</Label>
              <Input id="guestName" className="mt-1" {...form.register("guestName")} />
            </div>
            <div>
              <Label htmlFor="guests">Guests</Label>
              <Input id="guests" type="number" min={1} max={room?.maxGuests ?? 4} className="mt-1" {...form.register("guests")} />
            </div>
            <div>
              <Label htmlFor="guestPhone">WhatsApp number</Label>
              <Input id="guestPhone" className="mt-1" placeholder="98xxxxxxxx" {...form.register("guestPhone")} />
            </div>
            <div>
              <Label htmlFor="guestEmail">Email</Label>
              <Input id="guestEmail" type="email" className="mt-1" {...form.register("guestEmail")} />
            </div>
          </div>

          {available === false && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Those dates are blocked on the live calendar. Try another range.
            </p>
          )}

          {quote && available && (
            <div className="rounded-2xl bg-muted p-4 text-sm">
              <div className="flex items-center justify-between">
                <span>
                  {quote.nights} night{quote.nights > 1 ? "s" : ""}
                </span>
                <strong>{formatInr(quote.totalAmount)}</strong>
              </div>
              <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-muted-foreground">
                {quote.breakdown.map((night) => (
                  <li key={night.date} className="flex justify-between">
                    <span>
                      {night.date}
                      {night.overridden ? " · seasonal" : ""}
                    </span>
                    <span>{formatInr(night.amount)}</span>
                  </li>
                ))}
              </ul>
              {depositPercent < 100 ? (
                (() => {
                  const { depositAmount, balanceDue } = splitDeposit(quote.totalAmount, depositPercent);
                  return (
                    <div className="mt-3 space-y-1 border-t pt-2">
                      <div className="flex justify-between font-medium text-foreground">
                        <span>Pay now ({depositPercent}% advance)</span>
                        <span>{formatInr(depositAmount)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Balance at check-in</span>
                        <span>{formatInr(balanceDue)}</span>
                      </div>
                    </div>
                  );
                })()
              ) : null}
              <p className="mt-2 text-xs">
                Check-in {PROPERTY.checkIn} · Check-out {PROPERTY.checkOut}
              </p>
            </div>
          )}

          {cancellationPolicy && (
            <p className="text-center text-xs text-muted-foreground">
              Free cancellation up to {cancellationPolicy.freeCancellationDays} day(s) before check-in. After that a{" "}
              {cancellationPolicy.cancellationFeePercent}% fee applies.{" "}
              <a href="/manage-booking" className="underline underline-offset-4">
                Manage or cancel a booking
              </a>
            </p>
          )}

          <Button type="submit" className="w-full" disabled={!canPay || submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {depositPercent < 100 && quote
              ? `Pay ${formatInr(splitDeposit(quote.totalAmount, depositPercent).depositAmount)} now`
              : "Pay with UPI / Cards"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
