import { z } from "zod";

export const availabilityQuerySchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.coerce.number().int().min(1).max(8).default(2),
  roomId: z.string().optional(),
});

export const createOrderSchema = z.object({
  roomId: z.string().min(1),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.coerce.number().int().min(1).max(8),
  guestName: z.string().min(2).max(80),
  guestPhone: z.string().min(10).max(20),
  guestEmail: z.string().email(),
});

export const adminLoginSchema = z.object({
  password: z.string().min(1),
});

export const blockDateSchema = z.object({
  roomId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  blocked: z.boolean(),
  note: z.string().max(160).optional(),
});

export const priceOverrideSchema = z.object({
  roomId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  customPrice: z.coerce.number().int().min(500).max(50000),
  note: z.string().max(160).optional(),
});

export const icalFeedSchema = z.object({
  roomId: z.string().min(1),
  otaName: z.enum(["MMT", "BOOKING_COM", "AIRBNB"]),
  importUrl: z
    .string()
    .trim()
    .transform((value) => value.replace(/^webcal:/i, "https:"))
    .pipe(z.string().url()),
});

export const roomRateSchema = z.object({
  roomId: z.string().min(1),
  basePrice: z.coerce.number().int().min(500).max(50000),
});

export const priceRangeSchema = z.object({
  roomId: z.string().min(1),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  customPrice: z.coerce.number().int().min(500).max(50000),
  note: z.string().max(160).optional(),
});

export const bookingUpdateSchema = z.object({
  id: z.string().min(1),
  paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "CANCELLED"]).optional(),
  notes: z.string().max(400).optional(),
  razorpayPaymentId: z.string().max(80).optional(),
  totalAmount: z.coerce.number().int().min(0).max(200000).optional(),
  guestName: z.string().min(2).max(80).optional(),
  guestPhone: z.string().min(5).max(20).optional(),
});

export const siteSettingsSchema = z.object({
  depositPercent: z.coerce.number().int().min(1).max(100).optional(),
  freeCancellationDays: z.coerce.number().int().min(0).max(30).optional(),
  cancellationFeePercent: z.coerce.number().int().min(0).max(100).optional(),
});

export const bookingLookupSchema = z.object({
  bookingNumber: z.string().trim().min(4).max(40),
  guestPhone: z.string().trim().min(5).max(20),
});

export const bookingCancelSchema = bookingLookupSchema;
