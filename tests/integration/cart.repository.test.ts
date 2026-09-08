import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { createDatabase } from "@/db/create-database";
import { carts } from "@/db/schema/cart";
import { categories, products } from "@/db/schema/catalog";
import { DrizzleCartRepository } from "@/features/cart/cart.repository";
import { DrizzleCatalogRepository } from "@/features/catalog/catalog.repository";
import { fingerprintChoiceIds } from "@/features/catalog/pricing";
import { env } from "@/lib/env";

const testDb = createDatabase(env.TEST_DATABASE_URL);
const catalog = new DrizzleCatalogRepository(testDb);
const repository = new DrizzleCartRepository(testDb);

const createdCartIds: string[] = [];
const createdProductIds: string[] = [];
const createdCategoryIds: string[] = [];

afterEach(async () => {
  for (const id of createdCartIds.splice(0)) {
    await testDb.delete(carts).where(eq(carts.id, id));
  }
  for (const id of createdProductIds.splice(0)) {
    await testDb.delete(products).where(eq(products.id, id));
  }
  for (const id of createdCategoryIds.splice(0).reverse()) {
    await testDb.delete(categories).where(eq(categories.id, id));
  }
});

async function seedProduct() {
  const suffix = randomUUID();
  const category = await catalog.createCategory({
    name: "Café e insumos",
    slug: `cafe-cart-${suffix}`,
    parentId: null,
    attributes: [],
  });
  createdCategoryIds.push(category.id);

  const product = await catalog.createProduct({
    product: {
      title: "Café de especialidad 1 kg",
      slug: `cafe-cart-${suffix}`,
      categoryId: category.id,
      purchaseMode: "direct_purchase",
      priceMinor: 38_900,
      summary: "Producto para líneas de carrito.",
      description: "",
      published: true,
      optionGroups: [],
    },
    attributes: {},
  });
  createdProductIds.push(product.id);
  return product;
}

describe("DrizzleCartRepository", () => {
  it("creates a cart and persists a line with a UUID choice array and fingerprint", async () => {
    const product = await seedProduct();
    const cart = await repository.createCart();
    createdCartIds.push(cart.id);
    const choiceIds = [randomUUID(), randomUUID()];
    const choiceFingerprint = fingerprintChoiceIds(choiceIds);

    const inserted = await repository.insertItem({
      cartId: cart.id,
      productId: product.id,
      quantity: 2,
      choiceIds,
      choiceFingerprint,
    });

    expect(inserted).toEqual(
      expect.objectContaining({
        cartId: cart.id,
        productId: product.id,
        quantity: 2,
        choiceIds,
        choiceFingerprint,
      }),
    );

    await expect(repository.listItems(cart.id)).resolves.toEqual([
      expect.objectContaining({
        id: inserted.id,
        choiceIds,
        choiceFingerprint,
        quantity: 2,
      }),
    ]);
    await expect(
      repository.findItemByFingerprint(cart.id, product.id, choiceFingerprint),
    ).resolves.toEqual(expect.objectContaining({ id: inserted.id }));
  });

  it("updates quantity and deletes a line", async () => {
    const product = await seedProduct();
    const cart = await repository.createCart();
    createdCartIds.push(cart.id);
    const inserted = await repository.insertItem({
      cartId: cart.id,
      productId: product.id,
      quantity: 1,
      choiceIds: [],
      choiceFingerprint: fingerprintChoiceIds([]),
    });

    await expect(repository.updateItemQuantity(inserted.id, 7)).resolves.toEqual(
      expect.objectContaining({ id: inserted.id, quantity: 7 }),
    );
    await expect(repository.deleteItem(inserted.id)).resolves.toBe(true);
    await expect(repository.listItems(cart.id)).resolves.toEqual([]);
  });

  it("upserts the same line by incrementing quantity up to 99", async () => {
    const product = await seedProduct();
    const cart = await repository.createCart();
    createdCartIds.push(cart.id);
    const payload = {
      cartId: cart.id,
      productId: product.id,
      quantity: 90,
      choiceIds: [] as string[],
      choiceFingerprint: fingerprintChoiceIds([]),
    };

    const first = await repository.upsertItem(payload);
    const second = await repository.upsertItem({ ...payload, quantity: 20 });

    expect(second.id).toBe(first.id);
    expect(second.quantity).toBe(99);
    await expect(repository.listItems(cart.id)).resolves.toEqual([
      expect.objectContaining({ id: first.id, quantity: 99 }),
    ]);
  });

  it("rejects a second line with the same cart, product, and fingerprint", async () => {
    const product = await seedProduct();
    const cart = await repository.createCart();
    createdCartIds.push(cart.id);
    const payload = {
      cartId: cart.id,
      productId: product.id,
      quantity: 1,
      choiceIds: [] as string[],
      choiceFingerprint: fingerprintChoiceIds([]),
    };

    await repository.insertItem(payload);
    await expect(repository.insertItem(payload)).rejects.toThrow();
  });
});
