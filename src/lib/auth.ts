import { cookies } from "next/headers";
import { adminCookieName, adminCookieOptions, createAdminToken, verifyAdminToken } from "@/lib/admin-token";

export { adminCookieName, adminCookieOptions, createAdminToken, verifyAdminToken };

export function isAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD?.trim();
  return Boolean(expected) && password.trim() === expected;
}

export function isAdminPasswordConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD?.trim());
}

export async function isAdminSession() {
  const store = cookies();
  return verifyAdminToken(store.get(adminCookieName())?.value);
}
