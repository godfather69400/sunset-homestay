import { NextResponse } from "next/server";
import { getDepositPercent } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public — the guest booking form needs to know the advance-payment
// percentage before checkout so it can show "pay ₹X now, ₹Y at check-in".
export async function GET() {
  const depositPercent = await getDepositPercent();
  return NextResponse.json({ depositPercent });
}
