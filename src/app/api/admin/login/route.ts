import { NextResponse } from "next/server";
import { adminCookieOptions, createAdminToken, isAdminPassword } from "@/lib/auth";
import { adminLoginSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = adminLoginSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  if (!isAdminPassword(parsed.data.password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = createAdminToken();
  const cookie = adminCookieOptions();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookie.name, token, cookie.options);
  return response;
}
