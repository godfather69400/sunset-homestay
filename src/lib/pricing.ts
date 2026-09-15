import { WEEKEND_SURGE } from "./constants";
import { eachNight, toDateKey } from "./utils";

export type PriceOverrideLike = {
  date: Date | string;
  customPrice: number;
};

export function isWeekendNight(date: Date) {
  const day = date.getDay();
  return day === 5 || day === 6;
}

export function nightlyRate(
  basePrice: number,
  date: Date,
  overrides: Map<string, number>,
) {
  const override = overrides.get(toDateKey(date));
  if (typeof override === "number") return override;
  if (isWeekendNight(date)) return Math.round(basePrice * WEEKEND_SURGE);
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
    weekend: isWeekendNight(date) && !overrideMap.has(toDateKey(date)),
    overridden: overrideMap.has(toDateKey(date)),
  }));

  const totalAmount = breakdown.reduce((sum, night) => sum + night.amount, 0);

  return {
    nights: nights.length,
    breakdown,
    totalAmount,
  };
}
