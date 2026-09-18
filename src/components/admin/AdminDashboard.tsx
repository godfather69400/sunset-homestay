"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDayLabel, formatInr } from "@/lib/utils";
import { PROPERTY } from "@/lib/constants";

type Occupancy = {
  status: "available" | "booked" | "pending" | "blocked";
  bookingId?: string;
  source?: string;
  guestName?: string;
  notes?: string | null;
  bookingNumber?: string;
};

type RoomRow = {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  occupancy: Record<string, Occupancy>;
  prices: Record<string, number>;
  icalFeeds: {
    id: string;
    otaName: "MMT" | "BOOKING_COM" | "AIRBNB";
    importUrl: string;
    lastSyncedAt: string | null;
    lastError: string | null;
  }[];
};

type BookingRow = {
  id: string;
  bookingNumber: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  guestCount: number;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  depositAmount: number;
  balanceDue: number;
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "CANCELLED";
  source: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  notes: string | null;
  whatsappSentAt: string | null;
  whatsappError: string | null;
  createdAt: string;
  roomName: string;
};

const STATUS_CLASS: Record<Occupancy["status"], string> = {
  available: "bg-emerald-50 hover:bg-emerald-100",
  booked: "bg-rose-200 text-rose-950",
  pending: "bg-amber-200",
  blocked: "bg-stone-400 text-white",
};

type Tab = "inventory" | "rates" | "bookings" | "ota";

function copy(value: string) {
  navigator.clipboard.writeText(value);
  toast.success("Copied");
}

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("inventory");
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [days, setDays] = useState<string[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function load(nextMonth = month) {
    setLoading(true);
    try {
      const [calRes, bookRes] = await Promise.all([
        fetch(`/api/admin/calendar?month=${nextMonth}`),
        fetch("/api/admin/bookings"),
      ]);
      const cal = await calRes.json().catch(() => ({}));
      const book = bookRes.ok ? await bookRes.json() : { bookings: [] };
      if (!calRes.ok) {
        toast.error(cal.error ?? "Could not load calendar. Tables may not exist yet.");
        return;
      }
      setDays(cal.days ?? []);
      setRooms(cal.rooms ?? []);
      setBookings(book.bookings ?? []);
    } catch {
      toast.error("Could not load the owner desk.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleBlock(room: RoomRow, date: string) {
    const current = room.occupancy[date];
    const blocked = current?.status !== "blocked";
    const res = await fetch("/api/admin/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room.id, date, blocked }),
    });
    if (!res.ok) {
      toast.error("Could not update block");
      return;
    }
    await load();
  }

  // Cancels a guest booking (or clears a stale OTA hold) straight from the
  // calendar cell — the room frees up immediately once cancelled.
  async function cancelOccupiedCell(room: RoomRow, date: string) {
    const cell = room.occupancy[date];
    if (!cell?.bookingId) return;
    const isOta = cell.source?.startsWith("ICAL_");
    const label = `${cell.source ?? ""}${cell.guestName ? ` · ${cell.guestName}` : ""}${cell.notes ? ` · ${cell.notes}` : ""}`;
    const message = isOta
      ? `${label}\n\nThis night is held by an OTA calendar sync. Only clear it here if you have already cancelled the reservation on that OTA — otherwise it will just re-sync on the next pull.\n\nClear this hold and free the room?`
      : `${label}\n\nCancel this booking and free the room for ${date}? This cannot be undone from here.`;
    if (!window.confirm(message)) return;

    const res = await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cell.bookingId, paymentStatus: "CANCELLED" }),
    });
    if (!res.ok) {
      toast.error("Could not cancel that booking");
      return;
    }
    toast.success("Booking cancelled and room freed");
    await load();
  }

  function handleCellClick(room: RoomRow, date: string, shiftKey: boolean) {
    if (shiftKey) {
      saveDayPrice(room, date);
      return;
    }
    const status = room.occupancy[date]?.status ?? "available";
    if (status === "booked" || status === "pending") {
      cancelOccupiedCell(room, date);
      return;
    }
    toggleBlock(room, date);
  }

  async function saveDayPrice(room: RoomRow, date: string) {
    const value = window.prompt(`Rate for ${room.name} on ${date}`, String(room.prices[date] ?? room.basePrice));
    if (!value) return;
    const customPrice = Number(value);
    if (!Number.isFinite(customPrice)) return;
    const res = await fetch("/api/admin/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room.id, date, customPrice, note: "Admin day edit" }),
    });
    if (!res.ok) {
      toast.error("Could not save price");
      return;
    }
    toast.success("Nightly rate saved");
    await load();
  }

  async function saveFeed(roomId: string, otaName: RoomRow["icalFeeds"][number]["otaName"], importUrl: string) {
    const res = await fetch("/api/admin/ical-feeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, otaName, importUrl }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Could not save iCal URL");
      return;
    }
    if (data.syncError) {
      toast.error(`Saved, but pull failed: ${data.syncError}`);
    } else {
      const imported = data.sync?.imported ?? 0;
      toast.success(`Saved and pulled ${imported} night block${imported === 1 ? "" : "s"}`);
    }
    await load();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "inventory", label: "Calendar" },
    { id: "rates", label: "Room prices" },
    { id: "bookings", label: "Payments" },
    { id: "ota", label: "OTA sync" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Owner desk</h1>
          <p className="text-sm text-muted-foreground">
            Change rates, block nights, paste OTA calendars, and keep UPI payments in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-44" />
          <Button variant="outline" onClick={() => load(month)} disabled={loading}>
            Refresh
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              const res = await fetch("/api/admin/sync-ical", { method: "POST" });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                toast.error(data.error ?? "Sync failed");
                return;
              }
              const results = Array.isArray(data.results) ? data.results : [];
              const failed = results.filter((item: { ok?: boolean }) => item.ok === false);
              const imported = results.reduce(
                (sum: number, item: { imported?: number }) => sum + (item.imported ?? 0),
                0,
              );
              if (failed.length) {
                toast.error(
                  `Pulled with ${failed.length} error${failed.length === 1 ? "" : "s"}. Check OTA sync for details.`,
                );
              } else {
                toast.success(`OTA calendars pulled in (${imported} night blocks)`);
              }
              await load(month);
            }}
          >
            Pull OTA dates
          </Button>
          <Button variant="ghost" onClick={logout}>
            Log out
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Button key={item.id} variant={tab === item.id ? "default" : "outline"} onClick={() => setTab(item.id)}>
            {item.label}
          </Button>
        ))}
      </div>

      {loading && rooms.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading calendar…</p>
      ) : null}

      {tab === "inventory" && (
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Tap an empty cell to block a walk-in/maintenance night. Tap a booked or OTA cell to see who/what it is and
            cancel it if needed. Shift-tap any cell to set that night’s rate.
          </p>
          <div className="overflow-x-auto rounded-2xl border bg-card">
            <table className="min-w-[900px] w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/60">
                  <th className="sticky left-0 z-10 bg-muted/80 p-3 text-left">Room</th>
                  {days.map((day) => (
                    <th key={day} className="p-2 font-medium">
                      {formatDayLabel(day)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id} className="border-b">
                    <td className="sticky left-0 z-10 min-w-[180px] bg-card p-3">
                      <div className="font-medium">{room.name}</div>
                      <div className="text-muted-foreground">Base {formatInr(room.basePrice)}</div>
                    </td>
                    {days.map((day) => {
                      const cell = room.occupancy[day] ?? { status: "available" as const };
                      return (
                        <td key={day} className="p-1">
                          <button
                            type="button"
                            title={`${cell.status}${cell.source ? ` · ${cell.source}` : ""}${cell.guestName ? ` · ${cell.guestName}` : ""}${cell.notes ? ` · ${cell.notes}` : ""}`}
                            onClick={(event) => handleCellClick(room, day, event.shiftKey)}
                            className={`flex h-14 w-14 flex-col items-center justify-center rounded-lg ${STATUS_CLASS[cell.status]}`}
                          >
                            <span className="font-medium">
                              {formatInr(room.prices[day] ?? room.basePrice).replace("₹", "")}
                            </span>
                            <span className="text-[10px] uppercase">
                              {cell.status === "available" ? "" : cell.status}
                            </span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "rates" && (
        <RatesPanel rooms={rooms} onSaved={() => load(month)} />
      )}

      {tab === "bookings" && (
        <BookingsPanel bookings={bookings} onSaved={() => load(month)} />
      )}

      {tab === "ota" && (
        <OtaPanel rooms={rooms} origin={origin} onSaveFeed={saveFeed} />
      )}
    </div>
  );
}

function DepositSettingsPanel() {
  const [depositPercent, setDepositPercent] = useState<number | null>(null);
  const [draft, setDraft] = useState("100");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.depositPercent === "number") {
          setDepositPercent(data.depositPercent);
          setDraft(String(data.depositPercent));
        }
      })
      .catch(() => {});
  }, []);

  async function save() {
    const value = Number(draft);
    if (!Number.isFinite(value) || value < 1 || value > 100) {
      toast.error("Enter a percentage between 1 and 100");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositPercent: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not save");
        return;
      }
      setDepositPercent(data.depositPercent);
      toast.success(
        data.depositPercent >= 100
          ? "Guests will pay 100% online to book"
          : `Guests now pay ${data.depositPercent}% online — the rest at check-in`,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border bg-card p-5">
      <h2 className="font-serif text-2xl">Advance payment</h2>
      <p className="text-sm text-muted-foreground">
        How much of the total stay a guest must pay online to confirm the booking. The rest is collected at
        check-in. Set to 100 to require full payment upfront, like before.
      </p>
      <div className="flex items-end gap-3">
        <div>
          <Label>Advance %</Label>
          <Input
            type="number"
            min={1}
            max={100}
            className="mt-1 w-28"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </div>
        <Button onClick={save} disabled={saving}>
          Save
        </Button>
        {depositPercent !== null && (
          <span className="text-sm text-muted-foreground">
            Currently: {depositPercent}% online{depositPercent < 100 ? ", rest at check-in" : ""}
          </span>
        )}
      </div>
    </section>
  );
}

function RatesPanel({ rooms, onSaved }: { rooms: RoomRow[]; onSaved: () => Promise<void> }) {
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rangePrice, setRangePrice] = useState("");
  const [rangeRoom, setRangeRoom] = useState(rooms[0]?.id ?? "");
  const [note, setNote] = useState("Weekend / holiday surge");

  useEffect(() => {
    setDrafts(Object.fromEntries(rooms.map((room) => [room.id, room.basePrice])));
    if (!rangeRoom && rooms[0]) setRangeRoom(rooms[0].id);
  }, [rooms, rangeRoom]);

  async function saveBase(roomId: string) {
    const res = await fetch("/api/admin/rooms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, basePrice: drafts[roomId] }),
    });
    if (!res.ok) {
      toast.error("Could not save base rate");
      return;
    }
    toast.success("Base rate updated for new bookings");
    await onSaved();
  }

  async function saveRange() {
    if (!rangeRoom || !from || !to || !rangePrice) {
      toast.error("Pick a room, dates and a rate");
      return;
    }
    const res = await fetch("/api/admin/prices/range", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: rangeRoom,
        from,
        to,
        customPrice: Number(rangePrice),
        note,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not save range");
      return;
    }
    toast.success(`Updated ${data.nights} night(s)`);
    await onSaved();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <DepositSettingsPanel />
      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="font-serif text-2xl">Everyday base rate</h2>
        <p className="text-sm text-muted-foreground">
          This is what guests pay every night by default — no automatic weekend surge is applied. Use “Special
          dates” below for weekends, holidays or events. Save each room after you edit it.
        </p>
        {rooms.map((room) => (
          <div key={room.id} className="flex flex-wrap items-end gap-3 border-b pb-4">
            <div className="min-w-[180px] flex-1">
              <Label>{room.name}</Label>
              <Input
                type="number"
                className="mt-1"
                value={drafts[room.id] ?? room.basePrice}
                onChange={(event) =>
                  setDrafts((current) => ({ ...current, [room.id]: Number(event.target.value) }))
                }
              />
            </div>
            <Button onClick={() => saveBase(room.id)}>Save</Button>
          </div>
        ))}
      </section>
      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="font-serif text-2xl">Special dates</h2>
        <p className="text-sm text-muted-foreground">
          Use this for weekends, Paragliding World Cup, or Diwali. Inclusive of both dates.
        </p>
        <div>
          <Label>Room</Label>
          <select
            className="mt-1 h-11 w-full rounded-xl border bg-card px-3 text-sm"
            value={rangeRoom}
            onChange={(event) => setRangeRoom(event.target.value)}
          >
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>From</Label>
            <Input type="date" className="mt-1" value={from} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" className="mt-1" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
        </div>
        <div>
          <Label>Nightly rate (₹)</Label>
          <Input type="number" className="mt-1" value={rangePrice} onChange={(event) => setRangePrice(event.target.value)} />
        </div>
        <div>
          <Label>Note</Label>
          <Input className="mt-1" value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <Button onClick={saveRange}>Apply to those nights</Button>
      </section>
    </div>
  );
}

function BookingsPanel({
  bookings,
  onSaved,
}: {
  bookings: BookingRow[];
  onSaved: () => Promise<void>;
}) {
  async function updateStatus(id: string, paymentStatus: BookingRow["paymentStatus"]) {
    const res = await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, paymentStatus }),
    });
    if (!res.ok) {
      toast.error("Could not update payment");
      return;
    }
    toast.success("Payment status saved");
    await onSaved();
  }

  async function saveNote(booking: BookingRow) {
    const notes = window.prompt("Internal note / UTR / walk-in detail", booking.notes ?? "") ?? undefined;
    if (notes === undefined) return;
    const razorpayPaymentId =
      window.prompt("Razorpay payment id (optional)", booking.razorpayPaymentId ?? "") || undefined;
    const res = await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: booking.id, notes, razorpayPaymentId }),
    });
    if (!res.ok) {
      toast.error("Could not save");
      return;
    }
    toast.success("Transaction details updated");
    await onSaved();
  }

  async function cancelBooking(booking: BookingRow) {
    if (
      !window.confirm(
        `Cancel booking ${booking.bookingNumber} for ${booking.guestName} (${booking.checkIn} → ${booking.checkOut})? This frees the room and cannot be undone from here.`,
      )
    ) {
      return;
    }
    await updateStatus(booking.id, "CANCELLED");
  }

  return (
    <section className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Only bookings taken directly on this site (plus paid walk-ins you enter here) show up below. OTA bookings
        imported from Airbnb/MMT/Booking.com appear as blocks on the Calendar tab — tap a booked cell there to see
        who it is or to cancel it.
      </p>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="min-w-[1080px] w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="p-3">Booking</th>
              <th className="p-3">Guest</th>
              <th className="p-3">Stay</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Payment ids</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id} className="border-t">
                <td className="p-3">
                  <div className="font-medium">{booking.bookingNumber}</div>
                  <div className="text-xs text-muted-foreground">
                    {booking.roomName} · {booking.source}
                  </div>
                </td>
                <td className="p-3">
                  {booking.guestName}
                  <div className="text-xs text-muted-foreground">{booking.guestPhone}</div>
                </td>
                <td className="p-3">
                  {booking.checkIn} → {booking.checkOut}
                </td>
                <td className="p-3">
                  {formatInr(booking.totalAmount)}
                  {booking.balanceDue > 0 ? (
                    <div className="text-xs text-muted-foreground">
                      Paid {formatInr(booking.depositAmount)} · Due {formatInr(booking.balanceDue)} at check-in
                    </div>
                  ) : null}
                </td>
                <td className="p-3">
                  <select
                    className="h-9 rounded-lg border bg-card px-2 text-xs"
                    value={booking.paymentStatus}
                    onChange={(event) =>
                      updateStatus(booking.id, event.target.value as BookingRow["paymentStatus"])
                    }
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="PAID">PAID</option>
                    <option value="FAILED">FAILED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  <div>Order {booking.razorpayOrderId ?? "—"}</div>
                  <div>Pay {booking.razorpayPaymentId ?? "—"}</div>
                  <div>
                    WhatsApp{" "}
                    {booking.whatsappSentAt
                      ? "sent"
                      : booking.whatsappError
                        ? "failed"
                        : "not sent"}
                  </div>
                  {booking.whatsappError ? (
                    <div className="mt-1 text-destructive">{booking.whatsappError}</div>
                  ) : null}
                  {booking.notes ? <div className="mt-1">{booking.notes}</div> : null}
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="outline" onClick={() => saveNote(booking)}>
                      Edit details
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        const res = await fetch("/api/admin/notify-whatsapp", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: booking.id }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          toast.error(data.error ?? "WhatsApp send failed");
                          await onSaved();
                          return;
                        }
                        toast.success("WhatsApp sent to guest and homestay");
                        await onSaved();
                      }}
                    >
                      Send WhatsApp
                    </Button>
                    {booking.paymentStatus !== "CANCELLED" && (
                      <Button size="sm" variant="destructive" onClick={() => cancelBooking(booking)}>
                        Cancel & unblock
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!bookings.length && (
              <tr>
                <td className="p-6 text-muted-foreground" colSpan={7}>
                  No direct guest payments yet. UPI bookings taken on this site will show up here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OtaPanel({
  rooms,
  origin,
  onSaveFeed,
}: {
  rooms: RoomRow[];
  origin: string;
  onSaveFeed: (roomId: string, otaName: RoomRow["icalFeeds"][number]["otaName"], importUrl: string) => Promise<void>;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="font-serif text-2xl">How two-way calendar sync works</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
          <li>
            This website publishes a live calendar for each room at{" "}
            <code>/api/ical/&lt;room-slug&gt;.ics</code>. Airbnb, MakeMyTrip/Goibibo and Booking.com import that URL so
            a direct UPI booking immediately blocks those nights on the OTA.
          </li>
          <li>
            Each OTA also gives you an export .ics URL. Paste it below and tap <strong>Save import</strong> — that
            also pulls their dates immediately. Use <strong>Pull OTA dates</strong> at the top to refresh all rooms.
            A background job also pulls every hour automatically.
          </li>
          <li>
            We cannot see inside the OTA&apos;s own system, so we cannot confirm they have pulled our calendar — that
            depends on how often each OTA refreshes on their side. If a guest ever books the same night on two
            platforms, our sync detects the overlap and texts you (and the developer) a “double-booking risk” alert
            on WhatsApp instead of silently importing it, so you can cancel the duplicate manually.
          </li>
          <li>
            Google already lists the house as{" "}
            <a className="underline" href={PROPERTY.googleListingUrl} target="_blank" rel="noreferrer">
              Sunset Point Home Stay And Food Corner
            </a>
            , Vill Kotli, {PROPERTY.phone}. After this site is live, add the URL in Google Business Profile → Website,
            and later in Google Hotel Center if you want a Book button on Google.
          </li>
        </ol>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border bg-card p-4 text-sm">
          <h3 className="font-medium">Airbnb</h3>
          <p className="mt-2 text-muted-foreground">Listing editor → Calendar → Availability settings → Connect to another website.</p>
          <p className="mt-2">Import: paste our export URL. Export: copy Airbnb’s .ics and paste it here as Airbnb.</p>
        </article>
        <article className="rounded-2xl border bg-card p-4 text-sm">
          <h3 className="font-medium">MakeMyTrip / Goibibo</h3>
          <p className="mt-2 text-muted-foreground">
            Partner Hub / extranet → Property → Calendar sync (iCal). The listing is already{" "}
            <a className="underline" href={PROPERTY.mmtUrl} target="_blank" rel="noreferrer">
              live on MMT
            </a>
            .
          </p>
          <p className="mt-2">Import our URL per room. Export MMT’s calendar URL into the MMT field below.</p>
        </article>
        <article className="rounded-2xl border bg-card p-4 text-sm">
          <h3 className="font-medium">Booking.com</h3>
          <p className="mt-2 text-muted-foreground">Extranet → Rates & Availability → Sync calendars → Add calendar connection.</p>
          <p className="mt-2">Same pattern: they import ours, we import theirs.</p>
        </article>
      </div>

      {rooms.map((room) => {
        const exportUrl = `${origin}/api/ical/${room.slug}.ics`;
        return (
          <form
            key={room.id}
            className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              onSaveFeed(
                room.id,
                form.get("otaName") as RoomRow["icalFeeds"][number]["otaName"],
                String(form.get("importUrl")),
              );
            }}
          >
            <div className="md:col-span-4 flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">{room.name}</div>
              <Button type="button" size="sm" variant="outline" onClick={() => copy(exportUrl)}>
                Copy export URL for OTAs
              </Button>
            </div>
            <p className="md:col-span-4 break-all text-xs text-muted-foreground">{exportUrl}</p>
            <div>
              <Label>OTA</Label>
              <select name="otaName" className="mt-1 h-11 w-full rounded-xl border bg-card px-3 text-sm" defaultValue="MMT">
                <option value="MMT">MakeMyTrip / Goibibo</option>
                <option value="AIRBNB">Airbnb</option>
                <option value="BOOKING_COM">Booking.com</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label>Paste their .ics export URL</Label>
              <Input name="importUrl" placeholder="https://..." className="mt-1" required />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                Save import
              </Button>
            </div>
            <div className="md:col-span-4 space-y-2 text-xs text-muted-foreground">
              {room.icalFeeds.length === 0 ? (
                <p>No OTA calendars saved for this room yet.</p>
              ) : (
                room.icalFeeds.map((feed) => (
                  <div key={feed.id} className="rounded-xl bg-muted/50 p-3">
                    <div className="font-medium text-foreground">{feed.otaName}</div>
                    <div className="mt-1 break-all">{feed.importUrl}</div>
                    <div className="mt-1">
                      last pull {feed.lastSyncedAt ? format(new Date(feed.lastSyncedAt), "dd MMM HH:mm") : "never"}
                    </div>
                    {feed.lastError ? <div className="mt-1 text-destructive">{feed.lastError}</div> : null}
                  </div>
                ))
              )}
            </div>
          </form>
        );
      })}
    </div>
  );
}
