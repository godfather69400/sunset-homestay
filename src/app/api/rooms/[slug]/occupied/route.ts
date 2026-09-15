import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOccupiedDates } from "@/lib/availability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } },
) {
  try {
    const room = await prisma.room.findFirst({
      where: { OR: [{ slug: params.slug }, { id: params.slug }] },
      select: { id: true },
    });

    if (!room) {
      return NextResponse.json({ dates: [] });
    }

    const dates = await getOccupiedDates(room.id);
    return NextResponse.json({ dates });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load occupancy" },
      { status: 500 },
    );
  }
}
