"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { parseDateKey } from "@/lib/utils";

type DateRangePickerProps = {
  checkIn?: string;
  checkOut?: string;
  bookedDates?: string[];
  onChange: (range: { checkIn?: string; checkOut?: string }) => void;
  numberOfMonths?: number;
};

export function DateRangePicker({
  checkIn,
  checkOut,
  bookedDates = [],
  onChange,
  numberOfMonths = 1,
}: DateRangePickerProps) {
  const selected: DateRange | undefined = useMemo(() => {
    const from = checkIn ? parseDateKey(checkIn) : undefined;
    const to = checkOut ? parseDateKey(checkOut) : undefined;
    if (!from && !to) return undefined;
    return { from: from ?? undefined, to: to ?? undefined };
  }, [checkIn, checkOut]);

  const disabled = useMemo(() => {
    const booked = bookedDates
      .map((value) => parseDateKey(value))
      .filter((value): value is Date => Boolean(value));
    return [{ before: new Date() }, ...booked];
  }, [bookedDates]);

  const label =
    checkIn && checkOut
      ? `${format(parseDateKey(checkIn)!, "dd MMM")} – ${format(parseDateKey(checkOut)!, "dd MMM")}`
      : "Select dates";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-12 w-full justify-start rounded-2xl font-normal">
          <CalendarDays className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <Calendar
          mode="range"
          selected={selected}
          numberOfMonths={numberOfMonths}
          disabled={disabled}
          onSelect={(range) => {
            onChange({
              checkIn: range?.from ? format(range.from, "yyyy-MM-dd") : undefined,
              checkOut: range?.to ? format(range.to, "yyyy-MM-dd") : undefined,
            });
          }}
        />
        <p className="px-3 pb-2 text-xs text-muted-foreground">
          Check-in 12:00 PM · Check-out 10:00 AM. Greyed dates are already booked via direct or OTA calendars.
        </p>
      </PopoverContent>
    </Popover>
  );
}
