"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDisplayDate, formatInr } from "@/lib/utils";

type BookingDetails = {
  bookingNumber: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  totalAmount: number;
  depositAmount: number;
  balanceDue: number;
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "CANCELLED";
  cancelledAt: string | null;
  refundAmount: number | null;
};

type RefundPreview = {
  daysUntilCheckIn: number;
  isFree: boolean;
  feeAmount: number;
  refundAmount: number;
};

type Policy = { freeCancellationDays: number; cancellationFeePercent: number };

export default function ManageBookingPage() {
  const [bookingNumber, setBookingNumber] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [refundPreview, setRefundPreview] = useState<RefundPreview | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [canCancel, setCanCancel] = useState(false);
  const [result, setResult] = useState<{ refundAmount: number; refundedAutomatically: boolean } | null>(null);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) setBookingNumber(ref);
  }, []);

  async function lookup(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/bookings/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingNumber, guestPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Booking not found");
        setBooking(null);
        return;
      }
      setBooking(data.booking);
      setRefundPreview(data.refundPreview);
      setPolicy(data.policy);
      setCanCancel(data.canCancel);
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function cancelBooking() {
    if (!booking) return;
    const confirmText =
      refundPreview && refundPreview.refundAmount > 0
        ? `Cancel this booking? ₹${refundPreview.refundAmount} will be refunded.`
        : "Cancel this booking? No refund is due as per the policy for these dates.";
    if (!window.confirm(confirmText)) return;

    setCancelling(true);
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingNumber, guestPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not cancel booking");
        return;
      }
      setResult({ refundAmount: data.refundAmount, refundedAutomatically: data.refundedAutomatically });
      setBooking({ ...booking, paymentStatus: "CANCELLED" });
      setCanCancel(false);
      toast.success("Booking cancelled");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 pb-20 pt-28">
      <h1 className="font-serif text-3xl">Manage your booking</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your booking ID (from your confirmation WhatsApp/email) and the phone number you booked with to view or
        cancel your stay.
      </p>

      <form className="mt-6 space-y-4 rounded-2xl border bg-card p-5" onSubmit={lookup}>
        <div>
          <Label htmlFor="bookingNumber">Booking ID</Label>
          <Input
            id="bookingNumber"
            className="mt-1"
            placeholder="SPH-20260919-AB12"
            value={bookingNumber}
            onChange={(event) => setBookingNumber(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="guestPhone">Phone number used to book</Label>
          <Input
            id="guestPhone"
            className="mt-1"
            placeholder="98xxxxxxxx"
            value={guestPhone}
            onChange={(event) => setGuestPhone(event.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Find my booking
        </Button>
      </form>

      {booking && (
        <div className="mt-6 space-y-3 rounded-2xl border bg-muted/40 p-5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Room</span>
            <span className="font-medium">{booking.roomName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Dates</span>
            <span className="font-medium">
              {formatDisplayDate(booking.checkIn)} – {formatDisplayDate(booking.checkOut)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium">{booking.paymentStatus}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-muted-foreground">Amount paid</span>
            <span className="font-medium">{formatInr(booking.depositAmount || booking.totalAmount)}</span>
          </div>

          {booking.paymentStatus === "CANCELLED" ? (
            <p className="rounded-xl bg-secondary/40 px-3 py-2 text-secondary-foreground">
              This booking is cancelled.
              {typeof booking.refundAmount === "number" && booking.refundAmount > 0
                ? ` Refund due: ${formatInr(booking.refundAmount)}.`
                : ""}
            </p>
          ) : (
            <>
              {refundPreview && policy && (
                <div className="rounded-xl bg-primary/10 px-3 py-3 text-primary">
                  {refundPreview.isFree ? (
                    <p>
                      Free cancellation — you are {refundPreview.daysUntilCheckIn} day(s) before check-in, at or
                      beyond the {policy.freeCancellationDays}-day free window. Full refund of{" "}
                      {formatInr(refundPreview.refundAmount)}.
                    </p>
                  ) : (
                    <p>
                      You are {refundPreview.daysUntilCheckIn} day(s) before check-in, inside the{" "}
                      {policy.freeCancellationDays}-day free-cancellation window. A {policy.cancellationFeePercent}%
                      fee ({formatInr(refundPreview.feeAmount)}) applies — refund of{" "}
                      {formatInr(refundPreview.refundAmount)}.
                    </p>
                  )}
                </div>
              )}
              {canCancel && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={cancelBooking}
                  disabled={cancelling}
                >
                  {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cancel this booking
                </Button>
              )}
            </>
          )}

          {result && (
            <p className="rounded-xl bg-secondary/40 px-3 py-2 text-secondary-foreground">
              Cancelled.{" "}
              {result.refundAmount > 0
                ? result.refundedAutomatically
                  ? `₹${result.refundAmount} refund initiated to your original payment method (5-7 working days).`
                  : `₹${result.refundAmount} is due back — the owner will refund you manually and confirm on WhatsApp.`
                : "No refund is due as per the cancellation policy."}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
