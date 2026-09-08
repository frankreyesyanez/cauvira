import { describe, expect, it } from "vitest";
import {
  CART_COOKIE,
  cartCookieOptions,
  parseCartCookieValue,
} from "@/features/cart/cart-cookie";

describe("cart cookie", () => {
  it("treats an invalid string as missing", () => {
    expect(parseCartCookieValue("not-a-uuid")).toBeNull();
    expect(parseCartCookieValue("")).toBeNull();
    expect(parseCartCookieValue(undefined)).toBeNull();
  });

  it("accepts a UUID cart id", () => {
    const cartId = "3d03a1c7-7ca0-44e0-8fcb-1ec03f5d48d0";
    expect(parseCartCookieValue(cartId)).toBe(cartId);
  });

  it("exposes the guest bag cookie name and options", () => {
    expect(CART_COOKIE).toBe("cauvira_cart");
    expect(cartCookieOptions()).toEqual({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: false,
    });
  });
});
