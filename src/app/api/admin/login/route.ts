import { NextResponse } from "next/server";
import { adminCookieName, adminCookieOptions, createAdminToken, isAdminPassword, isAdminPasswordConfigured } from "@/lib/auth";
import { adminLoginSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!isAdminPasswordConfigured()) {
      return NextResponse.json(
        { error: "ADMIN_PASSWORD is not set in Vercel Environment Variables." },
        { status: 500 },
      );
    }

    const parsed = adminLoginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    if (!isAdminPassword(parsed.data.password)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const token = await createAdminToken();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(adminCookieName(), token, adminCookieOptions());
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
