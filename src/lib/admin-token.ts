const COOKIE_NAME = "sph_admin";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function secret() {
  const value = process.env.ADMIN_SECRET?.trim();
  if (!value) throw new Error("ADMIN_SECRET is not configured.");
  return value;
}

async function sign(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}

export function adminCookieName() {
  return COOKIE_NAME;
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

export async function createAdminToken() {
  const exp = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = String(exp);
  return `${payload}.${await sign(payload)}`;
}

export async function verifyAdminToken(token?: string | null) {
  if (!token) return false;
  try {
    const separator = token.indexOf(".");
    if (separator <= 0) return false;
    const payload = token.slice(0, separator);
    const signature = token.slice(separator + 1);
    if (!payload || !signature) return false;
    const expected = await sign(payload);
    if (!safeEqual(signature, expected)) return false;
    const exp = Number(payload);
    return Number.isFinite(exp) && exp > Date.now();
  } catch {
    return false;
  }
}
