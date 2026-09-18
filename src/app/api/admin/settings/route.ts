import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/auth";
import { getDepositPercent, setDepositPercent } from "@/lib/settings";
import { siteSettingsSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const depositPercent = await getDepositPercent();
  return NextResponse.json({ depositPercent });
}

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = siteSettingsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const depositPercent = await setDepositPercent(parsed.data.depositPercent);
  return NextResponse.json({ ok: true, depositPercent });
}
