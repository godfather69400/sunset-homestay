import { NextResponse } from "next/server";
import { adminCookieOptions } from "@/lib/auth";

export async function POST() {
  const cookie = adminCookieOptions();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookie.name, "", { ...cookie.options, maxAge: 0 });
  return response;
}
