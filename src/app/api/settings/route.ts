import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public — the guest booking form and the manage-booking page need to know
// the advance-payment percentage and cancellation policy before checkout /
// cancellation so they can show the right numbers.
export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json(settings);
}
