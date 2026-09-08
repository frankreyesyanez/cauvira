import { CART_COOKIE, cartCookieOptions, parseCartCookieValue } from "./cart-cookie";
import type { CartRepository } from "./cart.repository";
import { CartInputError, createCartService } from "./cart.service";

export type AddToCartResult =
  | { ok: true; itemCount: number }
  | { ok: false; error: "missing_required" | "product_unavailable" };

type CookieStore = {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options?: object): void;
};

type CartActionService = {
  addItem(
    input: Parameters<ReturnType<typeof createCartService>["addItem"]>[0],
  ): Promise<{ itemCount: number }>;
  getCart(cartId: string): Promise<{ itemCount: number }>;
};

type CartActionDependencies = {
  cookies(): CookieStore | Promise<CookieStore>;
  cartRepo: Pick<CartRepository, "createCart">;
  cart: CartActionService;
};

function parseQuantity(value: FormDataEntryValue | null) {
  if (value == null || String(value).trim() === "") return 1;
  return Number(value);
}

function toAddToCartError(error: CartInputError): AddToCartResult {
  return {
    ok: false,
    error: error.reason === "missing_required" ? "missing_required" : "product_unavailable",
  };
}

export function createCartActions(dependencies: CartActionDependencies) {
  async function cookieStore() {
    return dependencies.cookies();
  }

  async function writeCartCookie(store: CookieStore, cartId: string) {
    store.set(CART_COOKIE, cartId, cartCookieOptions());
  }

  async function mintCartId() {
    const store = await cookieStore();
    const created = await dependencies.cartRepo.createCart();
    await writeCartCookie(store, created.id);
    return created.id;
  }

  async function ensureCartId() {
    const store = await cookieStore();
    const existing = parseCartCookieValue(store.get(CART_COOKIE)?.value);
    if (existing) return existing;
    return mintCartId();
  }

  async function getBagItemCount() {
    const store = await cookieStore();
    const cartId = parseCartCookieValue(store.get(CART_COOKIE)?.value);
    if (!cartId) return 0;
    const cart = await dependencies.cart.getCart(cartId);
    return cart.itemCount;
  }

  async function addToCartAction(formData: FormData): Promise<AddToCartResult> {
    const productId = String(formData.get("productId") ?? "").trim();
    const choiceIds = formData.getAll("choiceId").map(String);
    const quantity = parseQuantity(formData.get("quantity"));

    try {
      const cartId = await ensureCartId();
      try {
        const cart = await dependencies.cart.addItem({
          cartId,
          productId,
          choiceIds,
          quantity,
        });
        return { ok: true, itemCount: cart.itemCount };
      } catch (error) {
        if (!(error instanceof CartInputError) || error.reason !== "cart_not_found") {
          throw error;
        }
        const mintedId = await mintCartId();
        const cart = await dependencies.cart.addItem({
          cartId: mintedId,
          productId,
          choiceIds,
          quantity,
        });
        return { ok: true, itemCount: cart.itemCount };
      }
    } catch (error) {
      if (error instanceof CartInputError) {
        return toAddToCartError(error);
      }
      throw error;
    }
  }

  return {
    ensureCartId,
    getBagItemCount,
    addToCartAction,
  };
}
