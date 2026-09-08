import { describe, expect, it, vi } from "vitest";
import { CART_COOKIE } from "@/features/cart/cart-cookie";
import { createCartActions } from "@/features/cart/cart.actions";
import { CartInputError } from "@/features/cart/cart.service";

const cartId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const mintedId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const productId = "11111111-1111-4111-8111-111111111111";

function cookieJar(initial?: Record<string, string>) {
  const values = new Map(Object.entries(initial ?? {}));
  return {
    values,
    get(name: string) {
      const value = values.get(name);
      return value === undefined ? undefined : { value };
    },
    set(name: string, value: string) {
      values.set(name, value);
    },
  };
}

function createActions(
  jar: ReturnType<typeof cookieJar>,
  overrides?: {
    createCart?: () => Promise<{ id: string }>;
    addItem?: (input: {
      cartId: string;
      productId: string;
      choiceIds: string[];
      quantity: number;
    }) => Promise<{ itemCount: number }>;
    getCart?: (cartId: string) => Promise<{ itemCount: number }>;
    updateQuantity?: (input: {
      cartId: string;
      itemId: string;
      quantity: number;
    }) => Promise<{ itemCount: number }>;
    removeItem?: (input: {
      cartId: string;
      itemId: string;
    }) => Promise<{ itemCount: number }>;
  },
) {
  const createCart = overrides?.createCart ?? vi.fn().mockResolvedValue({ id: mintedId });
  const addItem =
    overrides?.addItem ??
    vi.fn<(input: {
      cartId: string;
      productId: string;
      choiceIds: string[];
      quantity: number;
    }) => Promise<{ itemCount: number }>>().mockResolvedValue({ itemCount: 2 });
  const getCart =
    overrides?.getCart ??
    vi.fn<(cartId: string) => Promise<{ itemCount: number }>>().mockResolvedValue({
      itemCount: 4,
    });
  const updateQuantity =
    overrides?.updateQuantity ??
    vi.fn<(input: {
      cartId: string;
      itemId: string;
      quantity: number;
    }) => Promise<{ itemCount: number }>>().mockResolvedValue({ itemCount: 5 });
  const removeItem =
    overrides?.removeItem ??
    vi.fn<(input: {
      cartId: string;
      itemId: string;
    }) => Promise<{ itemCount: number }>>().mockResolvedValue({ itemCount: 0 });

  return {
    createCart,
    addItem,
    getCart,
    updateQuantity,
    removeItem,
    actions: createCartActions({
      cookies: () => jar,
      cartRepo: { createCart },
      cart: { addItem, getCart, updateQuantity, removeItem },
    }),
  };
}

describe("cart actions", () => {
  it("mints a cart row and cookie when ensureCartId has no valid id", async () => {
    const jar = cookieJar({ [CART_COOKIE]: "not-a-uuid" });
    const { actions, createCart } = createActions(jar);

    await expect(actions.ensureCartId()).resolves.toBe(mintedId);
    expect(createCart).toHaveBeenCalledTimes(1);
    expect(jar.get(CART_COOKIE)?.value).toBe(mintedId);
  });

  it("reuses a valid cookie without creating a cart", async () => {
    const jar = cookieJar({ [CART_COOKIE]: cartId });
    const { actions, createCart } = createActions(jar);

    await expect(actions.ensureCartId()).resolves.toBe(cartId);
    expect(createCart).not.toHaveBeenCalled();
  });

  it("returns 0 from getBagItemCount without creating a cart when the cookie is missing", async () => {
    const jar = cookieJar();
    const { actions, createCart, getCart } = createActions(jar);

    await expect(actions.getBagItemCount()).resolves.toBe(0);
    expect(createCart).not.toHaveBeenCalled();
    expect(getCart).not.toHaveBeenCalled();
  });

  it("adds a line from form data and returns the bag item count", async () => {
    const jar = cookieJar({ [CART_COOKIE]: cartId });
    const { actions, addItem, createCart } = createActions(jar);
    const formData = new FormData();
    formData.set("productId", productId);
    formData.append("choiceId", "choice-a");
    formData.append("choiceId", "choice-b");
    formData.set("quantity", "3");

    await expect(actions.addToCartAction(formData)).resolves.toEqual({
      ok: true,
      itemCount: 2,
    });
    expect(createCart).not.toHaveBeenCalled();
    expect(addItem).toHaveBeenCalledWith({
      cartId,
      productId,
      choiceIds: ["choice-a", "choice-b"],
      quantity: 3,
    });
  });

  it("defaults quantity to 1 when the field is omitted", async () => {
    const jar = cookieJar({ [CART_COOKIE]: cartId });
    const { actions, addItem } = createActions(jar);
    const formData = new FormData();
    formData.set("productId", productId);

    await actions.addToCartAction(formData);

    expect(addItem).toHaveBeenCalledWith({
      cartId,
      productId,
      choiceIds: [],
      quantity: 1,
    });
  });

  it("recreates the cart when add fails with cart_not_found", async () => {
    const jar = cookieJar({ [CART_COOKIE]: cartId });
    const addItem = vi
      .fn()
      .mockRejectedValueOnce(new CartInputError("cart_not_found"))
      .mockResolvedValueOnce({ itemCount: 1 });
    const { actions, createCart } = createActions(jar, { addItem });
    const formData = new FormData();
    formData.set("productId", productId);

    await expect(actions.addToCartAction(formData)).resolves.toEqual({
      ok: true,
      itemCount: 1,
    });
    expect(createCart).toHaveBeenCalledTimes(1);
    expect(jar.get(CART_COOKIE)?.value).toBe(mintedId);
    expect(addItem).toHaveBeenLastCalledWith({
      cartId: mintedId,
      productId,
      choiceIds: [],
      quantity: 1,
    });
  });

  it("maps named add failures to action errors", async () => {
    const jar = cookieJar({ [CART_COOKIE]: cartId });
    const missing = createActions(jar, {
      addItem: vi.fn().mockRejectedValue(new CartInputError("missing_required")),
    });
    const unavailable = createActions(cookieJar({ [CART_COOKIE]: cartId }), {
      addItem: vi.fn().mockRejectedValue(new CartInputError("product_unavailable")),
    });
    const formData = new FormData();
    formData.set("productId", productId);

    await expect(missing.actions.addToCartAction(formData)).resolves.toEqual({
      ok: false,
      error: "missing_required",
    });
    await expect(unavailable.actions.addToCartAction(formData)).resolves.toEqual({
      ok: false,
      error: "product_unavailable",
    });
  });

  it("updates a line quantity from form data", async () => {
    const jar = cookieJar({ [CART_COOKIE]: cartId });
    const { actions, updateQuantity } = createActions(jar);
    const formData = new FormData();
    formData.set("itemId", "item-1");
    formData.set("quantity", "7");

    await actions.updateCartItemQuantityAction(formData);

    expect(updateQuantity).toHaveBeenCalledWith({
      cartId,
      itemId: "item-1",
      quantity: 7,
    });
  });

  it("removes a line from form data", async () => {
    const jar = cookieJar({ [CART_COOKIE]: cartId });
    const { actions, removeItem } = createActions(jar);
    const formData = new FormData();
    formData.set("itemId", "item-1");

    await actions.removeCartItemAction(formData);

    expect(removeItem).toHaveBeenCalledWith({
      cartId,
      itemId: "item-1",
    });
  });
});
