import { eachNight, toDateKey } from "./utils";

export type PriceOverrideLike = {
  date: Date | string;
  customPrice: number;
};

export function isWeekendNight(date: Date) {
  const day = date.getDay();
  return day === 5 || day === 6;
}

/**
 * Nightly rate is always the room's base rate unless the owner has set a
 * special date (weekend, holiday, festival) from the admin panel. No surge is
 * applied automatically — the "weekend" flag below is informational only.
 */
export function nightlyRate(
  basePrice: number,
  date: Date,
  overrides: Map<string, number>,
) {
  const override = overrides.get(toDateKey(date));
  if (typeof override === "number") return override;
  return basePrice;
}

export function buildOverrideMap(overrides: PriceOverrideLike[]) {
  const map = new Map<string, number>();
  for (const item of overrides) {
    const date = item.date instanceof Date ? item.date : new Date(item.date);
    if (Number.isNaN(date.getTime())) continue;
    map.set(toDateKey(date), item.customPrice);
  }
  return map;
}

export function quoteStay(
  basePrice: number,
  checkIn: Date,
  checkOut: Date,
  overrides: PriceOverrideLike[],
) {
  const nights = eachNight(checkIn, checkOut);
  if (nights.length < 1) {
    throw new Error("Stay must include at least one night.");
  }

  const overrideMap = buildOverrideMap(overrides);
  const breakdown = nights.map((date) => ({
    date: toDateKey(date),
    amount: nightlyRate(basePrice, date, overrideMap),
    weekend: isWeekendNight(date),
    overridden: overrideMap.has(toDateKey(date)),
  }));

  const totalAmount = breakdown.reduce((sum, night) => sum + night.amount, 0);

  return {
    nights: nights.length,
    breakdown,
    totalAmount,
  };
}

/** Splits a stay total into the advance to charge now and the balance due at check-in. */
export function splitDeposit(totalAmount: number, depositPercent: number) {
  const clampedPercent = Math.min(100, Math.max(1, Math.round(depositPercent)));
  const depositAmount =
    clampedPercent >= 100 ? totalAmount : Math.min(totalAmount, Math.max(1, Math.round((totalAmount * clampedPercent) / 100)));
  const balanceDue = Math.max(0, totalAmount - depositAmount);
  return { depositAmount, balanceDue, depositPercent: clampedPercent };
}

/**
 * How much of the amount already paid gets refunded if a guest cancels right
 * now. Free cancellation if there are still `freeCancellationDays` or more
 * days left before check-in; otherwise the owner's cancellation fee is
 * forfeited and the rest is refunded.
 */
export function computeCancellationRefund(
  amountPaid: number,
  checkIn: Date,
  policy: { freeCancellationDays: number; cancellationFeePercent: number },
  now: Date = new Date(),
) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntilCheckIn = Math.ceil((startOfDayLocal(checkIn).getTime() - startOfDayLocal(now).getTime()) / msPerDay);
  const isFree = daysUntilCheckIn >= policy.freeCancellationDays;
  const feeAmount = isFree ? 0 : Math.round((amountPaid * policy.cancellationFeePercent) / 100);
  const refundAmount = Math.max(0, amountPaid - feeAmount);
  return { daysUntilCheckIn, isFree, feeAmount, refundAmount };
}

function startOfDayLocal(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
