# Sunset Point Homestay — Direct Booking App

Mobile-first Next.js booking site for Sunset Point Homestay, Bir (near Bir Bus Stand / Billing Road). Guests pay with Razorpay UPI/cards. Paid stays lock dates in Postgres and publish to an outbound iCal feed so MakeMyTrip / Airbnb / Booking.com cannot double-book. Inbound OTA `.ics` feeds are pulled on a cron and written as blocking bookings.

## Stack

Next.js 14 App Router · TypeScript · Tailwind · shadcn/ui · Prisma · Supabase Postgres · Razorpay · Twilio WhatsApp (or Meta Cloud API) · Vercel

## Setup

1. Copy `.env.example` to `.env.local` and fill Supabase, Razorpay, admin, cron, and WhatsApp values.
2. `npm install`
3. `npx prisma db push`
4. `npm run db:seed`
5. `npm run dev`

## Key routes

| Route | Purpose |
| --- | --- |
| `/` | Guest landing, availability bar, four rooms |
| `/rooms/[slug]` | Room detail + booking modal |
| `/admin` | Monthly inventory grid, manual blocks, price overrides, OTA iCal URLs |
| `POST /api/bookings/create-order` | Server-side quote + Razorpay order |
| `POST /api/webhooks/razorpay` | HMAC webhook → `PAID` + WhatsApp |
| `GET /api/ical/[roomId].ics` | Outbound calendar for OTAs |
| `GET /api/cron/sync-ical` | Inbound iCal worker (`Authorization: Bearer $CRON_SECRET`) |

## OTA wiring

- Give each OTA the export URL: `https://<domain>/api/ical/<room-slug>.ics`
- Paste each OTA’s export `.ics` URL in `/admin` per room.
- Vercel cron hits `/api/cron/sync-ical` daily on Hobby; raise frequency on Pro.

## Razorpay webhook

Point the webhook at `https://<domain>/api/webhooks/razorpay` for `payment.captured`, `order.paid`, and `payment.failed`. Signature is verified with `crypto.createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)`.
