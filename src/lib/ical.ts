import ical, { ICalCalendar } from "ical-generator";
import icalParser from "node-ical";
import { BookingSource, OtaName } from "@prisma/client";
import { prisma } from "./prisma";
import { PROPERTY } from "./constants";
import { addDays, generateBookingNumber, startOfDay, toDateKey } from "./utils";
import { isRoomAvailable } from "./availability";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sunsetpointbir.com";

export function otaToSource(otaName: OtaName): BookingSource {
  switch (otaName) {
    case "AIRBNB":
      return "ICAL_AIRBNB";
    case "BOOKING_COM":
      return "ICAL_BOOKING";
    case "MMT":
    default:
      return "ICAL_MMT";
  }
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/**
 * iCal timestamps are messy: DATE-only all-day values, floating local times,
 * TZID zones, and invalid DTEND/DTSTART pairs. Normalize to calendar dates
 * in the property timezone context (date-only, check-out exclusive).
 */
export function parseIcalDate(value: unknown): Date | null {
  if (!value) return null;

  if (isValidDate(value)) {
    if (
      (value as Date & { dateOnly?: boolean }).dateOnly ||
      (typeof (value as Date & { toISOString?: () => string }).toISOString ===
        "function" &&
        value.getUTCHours() === 0 &&
        value.getUTCMinutes() === 0)
    ) {
      return new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
    }
    return startOfDay(value);
  }

  if (typeof value === "string") {
    const compact = value.trim();
    const dateOnly = compact.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (dateOnly) {
      const year = Number(dateOnly[1]);
      const month = Number(dateOnly[2]);
      const day = Number(dateOnly[3]);
      const parsed = new Date(year, month - 1, day);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const dashed = compact.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dashed) {
      const parsed = new Date(Number(dashed[1]), Number(dashed[2]) - 1, Number(dashed[3]));
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const fallback = new Date(compact);
    return Number.isNaN(fallback.getTime()) ? null : startOfDay(fallback);
  }

  if (typeof value === "object" && value && "toJSDate" in value) {
    try {
      const jsDate = (value as { toJSDate: () => Date }).toJSDate();
      return isValidDate(jsDate) ? startOfDay(jsDate) : null;
    } catch {
      return null;
    }
  }

  return null;
}

export function normalizeStayWindow(start: Date, end: Date | null) {
  const checkIn = startOfDay(start);
  let checkOut = end ? startOfDay(end) : addDays(checkIn, 1);

  if (checkOut.getTime() === checkIn.getTime()) {
    checkOut = addDays(checkIn, 1);
  }

  if (checkOut < checkIn) {
    throw new Error(
      `Invalid iCal window: DTEND ${toDateKey(checkOut)} is before DTSTART ${toDateKey(checkIn)}`,
    );
  }

  return { checkIn, checkOut };
}

export function buildOutboundCalendar(
  roomName: string,
  roomId: string,
  bookings: { id: string; bookingNumber: string; checkIn: Date; checkOut: Date; source: string }[],
): ICalCalendar {
  const calendar = ical({
    name: `${PROPERTY.name} — ${roomName}`,
    prodId: { company: "Sunset Point Homestay", product: "Direct Booking Calendar" },
    timezone: "Asia/Kolkata",
    url: `${SITE_URL}/api/ical/${roomId}.ics`,
    ttl: 60 * 15,
  });

  for (const booking of bookings) {
    try {
      const { checkIn, checkOut } = normalizeStayWindow(booking.checkIn, booking.checkOut);
      calendar.createEvent({
        id: booking.bookingNumber,
        start: checkIn,
        end: checkOut,
        allDay: true,
        summary: "Reserved — Sunset Point Homestay",
        description: `Direct booking calendar block (${booking.source}). Booking ${booking.bookingNumber}.`,
        location: PROPERTY.address,
        url: SITE_URL,
      });
    } catch (error) {
      console.error("Skipping outbound event with bad timestamps", booking.id, error);
    }
  }

  return calendar;
}

export async function fetchAndParseFeed(importUrl: string) {
  try {
    const response = await fetch(importUrl, {
      cache: "no-store",
      headers: { Accept: "text/calendar, text/plain, */*" },
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      throw new Error(`Feed HTTP ${response.status} for ${importUrl}`);
    }

    const body = await response.text();
    if (!body || !body.includes("BEGIN:VCALENDAR")) {
      throw new Error("Remote payload is not a valid iCalendar document.");
    }

    const parser = icalParser as {
      parseICS?: (raw: string) => unknown;
      async?: { parseICS: (raw: string) => Promise<Record<string, unknown>>; fromURL: (url: string) => Promise<Record<string, unknown>> };
    };

    if (parser.async?.parseICS) {
      return parser.async.parseICS(body);
    }
    if (parser.parseICS) {
      return parser.parseICS(body) as Record<string, unknown>;
    }
    throw new Error("node-ical parser is unavailable.");
  } catch (error) {
    const parser = icalParser as {
      async?: { fromURL: (url: string) => Promise<Record<string, unknown>> };
      fromURL?: (url: string, opts: object, cb: (err: Error | null, data: Record<string, unknown>) => void) => void;
    };
    if (parser.async?.fromURL) {
      return parser.async.fromURL(importUrl);
    }
    throw error;
  }
}

type ParsedVEvent = {
  type?: string;
  uid?: string;
  summary?: string;
  start?: unknown;
  end?: unknown;
};

function asVEvent(entry: unknown): ParsedVEvent | null {
  if (!entry || typeof entry !== "object") return null;
  const event = entry as ParsedVEvent;
  if (event.type !== "VEVENT") return null;
  return event;
}

export async function syncInboundFeed(feedId: string) {
  const feed = await prisma.icalFeed.findUnique({
    where: { id: feedId },
    include: { room: true },
  });

  if (!feed) {
    throw new Error(`iCal feed ${feedId} not found.`);
  }

  const source = otaToSource(feed.otaName);
  const parsed = await fetchAndParseFeed(feed.importUrl);

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const raw of Object.values(parsed)) {
    const event = asVEvent(raw);
    if (!event) continue;

    const uid = (event.uid || event.summary || "").toString().trim();
    if (!uid) {
      skipped += 1;
      errors.push("Skipped VEVENT without UID.");
      continue;
    }

    const start = parseIcalDate(event.start);
    if (!start) {
      skipped += 1;
      errors.push(`Bad DTSTART for UID ${uid}`);
      continue;
    }

    let end: Date | null = null;
    try {
      end = parseIcalDate(event.end);
    } catch {
      end = null;
    }

    let window;
    try {
      window = normalizeStayWindow(start, end);
    } catch (error) {
      skipped += 1;
      errors.push(error instanceof Error ? error.message : `Bad window for UID ${uid}`);
      continue;
    }

    const summary = event.summary?.toString() ?? `${feed.otaName} reservation`;
    const bookingNumber = `OTA-${feed.otaName}-${uid}`.replace(/[^A-Za-z0-9-]/g, "").slice(0, 40);

    try {
      const existing = await prisma.booking.findFirst({
        where: {
          roomId: feed.roomId,
          OR: [{ icalUid: uid }, { bookingNumber }],
        },
      });

      if (existing) {
        await prisma.booking.update({
          where: { id: existing.id },
          data: {
            checkIn: window.checkIn,
            checkOut: window.checkOut,
            paymentStatus: "PAID",
            source,
            icalUid: uid,
            notes: summary,
            guestName: existing.guestName || `${feed.otaName} guest`,
          },
        });
      } else {
        const { available } = await isRoomAvailable(
          feed.roomId,
          window.checkIn,
          window.checkOut,
        );

        if (!available) {
          skipped += 1;
          errors.push(
            `Conflict importing ${uid} for ${feed.room.name} ${toDateKey(window.checkIn)}–${toDateKey(window.checkOut)}`,
          );
          continue;
        }

        await prisma.booking.create({
          data: {
            bookingNumber: existing ? bookingNumber : generateBookingNumber().replace("SPH", feed.otaName.slice(0, 3)),
            roomId: feed.roomId,
            guestName: `${feed.otaName} guest`,
            guestPhone: "OTA",
            guestEmail: "ota@sunsetpoint.local",
            guestCount: 1,
            checkIn: window.checkIn,
            checkOut: window.checkOut,
            totalAmount: 0,
            paymentStatus: "PAID",
            source,
            icalUid: uid,
            notes: summary,
          },
        });
      }

      imported += 1;
    } catch (error) {
      skipped += 1;
      errors.push(error instanceof Error ? `${uid}: ${error.message}` : `Failed UID ${uid}`);
    }
  }

  await prisma.icalFeed.update({
    where: { id: feed.id },
    data: {
      lastSyncedAt: new Date(),
      lastError: errors.length ? errors.slice(0, 8).join(" | ") : null,
    },
  });

  return { feedId: feed.id, room: feed.room.name, otaName: feed.otaName, imported, skipped, errors };
}

export async function syncAllInboundFeeds() {
  const feeds = await prisma.icalFeed.findMany();
  const results = [];

  for (const feed of feeds) {
    try {
      results.push({ ok: true, ...(await syncInboundFeed(feed.id)) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown iCal sync error";
      await prisma.icalFeed.update({
        where: { id: feed.id },
        data: { lastError: message, lastSyncedAt: new Date() },
      });
      results.push({ ok: false, feedId: feed.id, error: message });
    }
  }

  return results;
}
