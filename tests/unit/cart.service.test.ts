import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { PublishedProductDetail } from "@/features/catalog/catalog.repository";
import type { CatalogOptionGroup } from "@/features/catalog/pricing";
import type { CartItemRecord, CartRepository } from "@/features/cart/cart.repository";
import { CartInputError, createCartService } from "@/features/cart/cart.service";

const coffeeId = "11111111-1111-4111-8111-111111111111";
const iceId = "22222222-2222-4222-8222-222222222222";
const volt440Id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const installFullId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const volt220Id = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const installBasicId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const iceGroups: CatalogOptionGroup[] = [
  {
    id: "g-volt",
    name: "Voltaje",
    required: true,
    sortOrder: 0,
    values: [
      { id: volt220Id, label: "220 V", priceDeltaMinor: 0, sortOrder: 0 },
      { id: volt440Id, label: "440 V", priceDeltaMinor: 850_000, sortOrder: 1 },
    ],
  },
  {
    id: "g-install",
    name: "Instalación",
    required: true,
    sortOrder: 1,
    values: [
      { id: installBasicId, label: "Básica", priceDeltaMinor: 0, sortOrder: 0 },
      { id: installFullId, label: "Completa", priceDeltaMinor: 1_250_000, sortOrder: 1 },
    ],
  },
];

const coffee: PublishedProductDetail = {
  id: coffeeId,
  title: "Café de especialidad 1 kg",
  slug: "cafe-especialidad-grano-1kg",
  summary: "Lote trazable para cafeterías.",
  description: "",
  purchaseMode: "direct_purchase",
  priceMinor: 38_900,
  hasOptions: false,
  attributes: [],
  optionGroups: [],
  images: [{ id: "img-coffee", url: "/catalog/cafe.jpg", sortOrder: 0 }],
};

const ice: PublishedProductDetail = {
  id: iceId,
  title: "Máquina de hielo industrial 500 kg",
  slug: "maquina-de-hielo-industrial-500",
  summary: "Producción continua de hielo.",
  description: "",
  purchaseMode: "starting_price",
  priceMinor: 18_990_000,
  hasOptions: true,
  attributes: [],
  optionGroups: iceGroups,
  images: [{ id: "img-ice", url: "/catalog/hielo.jpg", sortOrder: 0 }],
};

function createMemoryCatalog(initial: PublishedProductDetail[]) {
  const products = new Map(initial.map((product) => [product.id, product]));
  return {
    async getPublishedProductById(id: string) {
      return products.get(id) ?? null;
    },
    unpublish(id: string) {
      products.delete(id);
    },
    replace(product: PublishedProductDetail) {
      products.set(product.id, product);
    },
  };
}

function createMemoryCartRepository(): CartRepository {
  const carts = new Set<string>();
  const items = new Map<string, CartItemRecord>();

  return {
    async createCart() {
      const id = randomUUID();
      carts.add(id);
      return { id };
    },
    async getCart(id: string) {
      return carts.has(id) ? { id } : null;
    },
    async listItems(cartId: string) {
      return [...items.values()].filter((item) => item.cartId === cartId);
    },
    async findItemByFingerprint(cartId, productId, choiceFingerprint) {
      await Promise.resolve();
      return (
        [...items.values()].find(
          (item) =>
            item.cartId === cartId &&
            item.productId === productId &&
            item.choiceFingerprint === choiceFingerprint,
        ) ?? null
      );
    },
    async getItem(id: string) {
      return items.get(id) ?? null;
    },
    async insertItem(input) {
      const duplicate = [...items.values()].find(
        (item) =>
          item.cartId === input.cartId &&
          item.productId === input.productId &&
          item.choiceFingerprint === input.choiceFingerprint,
      );
      if (duplicate) {
        throw Object.assign(
          new Error('duplicate key value violates unique constraint "cart_items_line_unique"'),
          { code: "23505", constraint_name: "cart_items_line_unique" },
        );
      }
      const record: CartItemRecord = { id: randomUUID(), ...input };
      items.set(record.id, record);
      return record;
    },
    async upsertItem(input) {
      const existing = await this.findItemByFingerprint(
        input.cartId,
        input.productId,
        input.choiceFingerprint,
      );
      if (existing) {
        const next = await this.updateItemQuantity(
          existing.id,
          Math.min(99, existing.quantity + input.quantity),
        );
        if (!next) {
          throw new Error("Failed to merge cart item");
        }
        return next;
      }
      try {
        return await this.insertItem(input);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
        if (code !== "23505" && !message.includes("cart_items_line_unique")) {
          throw error;
        }
        const raced = await this.findItemByFingerprint(
          input.cartId,
          input.productId,
          input.choiceFingerprint,
        );
        if (!raced) throw error;
        const next = await this.updateItemQuantity(
          raced.id,
          Math.min(99, raced.quantity + input.quantity),
        );
        if (!next) throw error;
        return next;
      }
    },
    async updateItemQuantity(id, quantity) {
      const current = items.get(id);
      if (!current) return null;
      const next = { ...current, quantity };
      items.set(id, next);
      return next;
    },
    async deleteItem(id: string) {
      return items.delete(id);
    },
  };
}

async function createService(initialProducts: PublishedProductDetail[] = [coffee, ice]) {
  const catalog = createMemoryCatalog(initialProducts);
  const cartRepo = createMemoryCartRepository();
  const service = createCartService(cartRepo, catalog);
  const cart = await cartRepo.createCart();
  return { service, catalog, cartRepo, cartId: cart.id };
}

describe("createCartService", () => {
  it("prices coffee with no choices at the product price", async () => {
    const { service, cartId } = await createService();

    const view = await service.addItem({
      cartId,
      productId: coffeeId,
      choiceIds: [],
      quantity: 2,
    });

    expect(view.items).toEqual([
      expect.objectContaining({
        productId: coffeeId,
        slug: coffee.slug,
        title: coffee.title,
        quantity: 2,
        choiceIds: [],
        choiceLabels: [],
        unitMinor: 38_900,
        lineMinor: 77_800,
        invalid: false,
        coverUrl: "/catalog/cafe.jpg",
      }),
    ]);
    expect(view.itemCount).toBe(2);
    expect(view.subtotalMinor).toBe(77_800);
  });

  it("prices ice with two required choices as base plus deltas", async () => {
    const { service, cartId } = await createService();

    const view = await service.addItem({
      cartId,
      productId: iceId,
      choiceIds: [volt440Id, installFullId],
      quantity: 1,
    });

    expect(view.items[0]).toEqual(
      expect.objectContaining({
        productId: iceId,
        quantity: 1,
        choiceIds: [volt440Id, installFullId],
        choiceLabels: ["440 V", "Completa"],
        unitMinor: 21_090_000,
        lineMinor: 21_090_000,
        invalid: false,
      }),
    );
    expect(view.subtotalMinor).toBe(21_090_000);
  });

  it("merges a second add with the same fingerprint into one line", async () => {
    const { service, cartId } = await createService();
    const payload = {
      cartId,
      productId: iceId,
      choiceIds: [installFullId, volt440Id],
      quantity: 2,
    };

    await service.addItem(payload);
    const view = await service.addItem({ ...payload, quantity: 3 });

    expect(view.items).toHaveLength(1);
    expect(view.items[0]?.quantity).toBe(5);
    expect(view.itemCount).toBe(5);
    expect(view.subtotalMinor).toBe(21_090_000 * 5);
  });

  it("merges concurrent first adds of the same line instead of throwing", async () => {
    const { service, cartId } = await createService();
    const payload = {
      cartId,
      productId: coffeeId,
      choiceIds: [] as string[],
      quantity: 2,
    };

    const [left, right] = await Promise.all([
      service.addItem(payload),
      service.addItem(payload),
    ]);
    const view = left.itemCount >= right.itemCount ? left : right;

    expect(view.items).toHaveLength(1);
    expect(view.items[0]?.quantity).toBe(4);
    expect(view.itemCount).toBe(4);
  });

  it("throws CartInputError missing_required when a required choice is absent", async () => {
    const { service, cartId } = await createService();

    await expect(
      service.addItem({
        cartId,
        productId: iceId,
        choiceIds: [volt220Id],
        quantity: 1,
      }),
    ).rejects.toMatchObject({
      name: "CartInputError",
      reason: "missing_required",
    });
    await expect(
      service.addItem({
        cartId,
        productId: iceId,
        choiceIds: [volt220Id],
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(CartInputError);
  });

  it("throws product_unavailable when the product is unpublished", async () => {
    const { service, cartId } = await createService();

    await expect(
      service.addItem({
        cartId,
        productId: "99999999-9999-4999-8999-999999999999",
        choiceIds: [],
        quantity: 1,
      }),
    ).rejects.toMatchObject({
      name: "CartInputError",
      reason: "product_unavailable",
    });
  });

  it("caps a merged quantity at 99", async () => {
    const { service, cartId } = await createService();

    await service.addItem({
      cartId,
      productId: coffeeId,
      choiceIds: [],
      quantity: 90,
    });
    const view = await service.addItem({
      cartId,
      productId: coffeeId,
      choiceIds: [],
      quantity: 20,
    });

    expect(view.items[0]?.quantity).toBe(99);
    expect(view.itemCount).toBe(99);
  });

  it("rejects a quantity outside 1–99", async () => {
    const { service, cartId } = await createService();

    await expect(
      service.addItem({
        cartId,
        productId: coffeeId,
        choiceIds: [],
        quantity: 0,
      }),
    ).rejects.toMatchObject({ reason: "invalid_quantity" });
    await expect(
      service.addItem({
        cartId,
        productId: coffeeId,
        choiceIds: [],
        quantity: 100,
      }),
    ).rejects.toMatchObject({ reason: "invalid_quantity" });
    await expect(
      service.addItem({
        cartId,
        productId: coffeeId,
        choiceIds: [],
        quantity: 1.5,
      }),
    ).rejects.toMatchObject({ reason: "invalid_quantity" });
  });

  it("keeps unpublished lines in itemCount and out of the subtotal", async () => {
    const { service, catalog, cartId } = await createService();

    await service.addItem({
      cartId,
      productId: coffeeId,
      choiceIds: [],
      quantity: 3,
    });
    catalog.unpublish(coffeeId);

    const view = await service.getCart(cartId);

    expect(view.items[0]).toEqual(
      expect.objectContaining({
        productId: coffeeId,
        quantity: 3,
        unitMinor: null,
        lineMinor: null,
        invalid: true,
      }),
    );
    expect(view.itemCount).toBe(3);
    expect(view.subtotalMinor).toBe(0);
  });

  it("marks unknown stored choices invalid without dropping the quantity", async () => {
    const { service, catalog, cartId } = await createService();

    await service.addItem({
      cartId,
      productId: iceId,
      choiceIds: [volt440Id, installFullId],
      quantity: 2,
    });
    catalog.replace({
      ...ice,
      optionGroups: [
        {
          ...iceGroups[0]!,
          values: [iceGroups[0]!.values[0]!],
        },
        iceGroups[1]!,
      ],
    });

    const view = await service.getCart(cartId);

    expect(view.items[0]).toEqual(
      expect.objectContaining({
        invalid: true,
        unitMinor: null,
        lineMinor: null,
        quantity: 2,
      }),
    );
    expect(view.itemCount).toBe(2);
    expect(view.subtotalMinor).toBe(0);
  });

  it("updates quantity and removes a line", async () => {
    const { service, cartId } = await createService();
    const added = await service.addItem({
      cartId,
      productId: coffeeId,
      choiceIds: [],
      quantity: 2,
    });
    const itemId = added.items[0]!.id;

    const updated = await service.updateQuantity({ cartId, itemId, quantity: 4 });
    expect(updated.items[0]?.quantity).toBe(4);
    expect(updated.itemCount).toBe(4);
    expect(updated.subtotalMinor).toBe(38_900 * 4);

    const emptied = await service.removeItem({ cartId, itemId });
    expect(emptied.items).toEqual([]);
    expect(emptied.itemCount).toBe(0);
    expect(emptied.subtotalMinor).toBe(0);
  });

  it("does not merge different choice fingerprints", async () => {
    const { service, cartId } = await createService();

    await service.addItem({
      cartId,
      productId: iceId,
      choiceIds: [volt440Id, installFullId],
      quantity: 1,
    });
    const view = await service.addItem({
      cartId,
      productId: iceId,
      choiceIds: [volt220Id, installBasicId],
      quantity: 1,
    });

    expect(view.items).toHaveLength(2);
    expect(view.itemCount).toBe(2);
    expect(view.subtotalMinor).toBe(21_090_000 + 18_990_000);
  });
});
