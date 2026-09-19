import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { getSiteSettings, setDepositPercent, setCancellationPolicy } from "@/lib/settings";
import { siteSettingsSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await getSiteSettings();
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = siteSettingsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { depositPercent, freeCancellationDays, cancellationFeePercent } = parsed.data;

  if (typeof depositPercent === "number") {
    await setDepositPercent(depositPercent);
  }
  if (typeof freeCancellationDays === "number" || typeof cancellationFeePercent === "number") {
    const current = await getSiteSettings();
    await setCancellationPolicy({
      freeCancellationDays: freeCancellationDays ?? current.freeCancellationDays,
      cancellationFeePercent: cancellationFeePercent ?? current.cancellationFeePercent,
    });
  }

  const settings = await getSiteSettings();
  return NextResponse.json({ ok: true, ...settings });
}
