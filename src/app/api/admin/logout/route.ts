import { NextResponse } from "next/server";
import { adminCookieName, adminCookieOptions } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminCookieName(), "", { ...adminCookieOptions(), maxAge: 0 });
  return response;
}
