import crypto from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export interface TokenData {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  token_type?: string;
  scope?: string;
}

const COOKIE_PREFIX = "gcal_tokens";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "your-32-char-secret-key-here-123";

function getCookieName(userId: string) {
  return `${COOKIE_PREFIX}_${userId}`;
}

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

function decrypt(payload: string): string {
  const [ivHex, encrypted] = payload.split(":");
  if (!ivHex || !encrypted) throw new Error("Invalid token payload");
  const iv = Buffer.from(ivHex, "hex");
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export async function saveTokensForUser(response: NextResponse, userId: string, tokens: TokenData): Promise<void> {
  const encrypted = encrypt(JSON.stringify(tokens));
  response.cookies.set({
    name: getCookieName(userId),
    value: encrypted,
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function loadTokensForUser(userId: string): Promise<TokenData | null> {
  try {
    const tokenCookie = cookies().get(getCookieName(userId));
    if (!tokenCookie?.value) return null;
    const decrypted = decrypt(tokenCookie.value);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("Failed to load tokens:", error);
    return null;
  }
}

export async function removeTokensForUser(response: NextResponse, userId: string): Promise<void> {
  response.cookies.delete(getCookieName(userId));
}
