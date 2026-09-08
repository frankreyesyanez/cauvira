import { z } from "zod";
import { env } from "@/lib/env";

export const CART_COOKIE = "cauvira_cart";

const cartIdSchema = z.uuid();

export function parseCartCookieValue(value: string | undefined): string | null {
  if (!value) return null;
  const parsed = cartIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function cartCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: env.BETTER_AUTH_URL.startsWith("https://"),
  };
}
