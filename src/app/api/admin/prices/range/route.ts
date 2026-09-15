import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eachNight, parseDateKey } from "@/lib/utils";
import { priceRangeSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = priceRangeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const from = parseDateKey(parsed.data.from);
  const toInclusive = parseDateKey(parsed.data.to);
  if (!from || !toInclusive) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const checkout = new Date(toInclusive);
  checkout.setDate(checkout.getDate() + 1);
  const nights = eachNight(from, checkout);
  if (!nights.length) {
    return NextResponse.json({ error: "Range must include at least one night" }, { status: 400 });
  }

  await prisma.$transaction(
    nights.map((date) =>
      prisma.priceOverride.upsert({
        where: { roomId_date: { roomId: parsed.data.roomId, date } },
        update: { customPrice: parsed.data.customPrice, note: parsed.data.note },
        create: {
          roomId: parsed.data.roomId,
          date,
          customPrice: parsed.data.customPrice,
          note: parsed.data.note,
        },
      }),
    ),
  );

  return NextResponse.json({ ok: true, nights: nights.length });
}
