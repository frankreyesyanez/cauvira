import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { createDatabase } from "@/db";
import { categories, products } from "@/db/schema/catalog";
import { DrizzleCatalogRepository } from "@/features/catalog/catalog.repository";
import { env } from "@/lib/env";

const testDb = createDatabase(env.TEST_DATABASE_URL);
const repository = new DrizzleCatalogRepository(testDb);

const createdProductIds: string[] = [];
const createdCategoryIds: string[] = [];

afterEach(async () => {
  for (const id of createdProductIds.splice(0)) {
    await testDb.delete(products).where(eq(products.id, id));
  }
  for (const id of createdCategoryIds.splice(0)) {
    await testDb.delete(categories).where(eq(categories.id, id));
  }
});

describe("DrizzleCatalogRepository", () => {
  it("persists category attributes and returns published product details", async () => {
    const suffix = randomUUID();
    const category = await repository.createCategory({
      name: "Máquinas de hielo",
      slug: `maquinas-hielo-${suffix}`,
      parentId: null,
      attributes: [
        {
          key: "daily_output",
          label: "Producción diaria",
          type: "number",
          required: true,
          filterable: true,
          comparable: true,
          unit: "kg/día",
          options: [],
        },
      ],
    });
    createdCategoryIds.push(category.id);

    const storedCategory = await repository.getCategoryWithAttributes(category.id);
    expect(storedCategory?.attributes).toContainEqual(
      expect.objectContaining({
        key: "daily_output",
        required: true,
        type: "number",
      }),
    );

    const product = await repository.createProduct({
      product: {
        title: "Máquina de hielo 500 kg",
        slug: `maquina-hielo-500-kg-${suffix}`,
        categoryId: category.id,
        purchaseMode: "quotation",
        priceMinor: null,
        summary: "Producción industrial para comercios.",
        description: "Equipo de producción continua.",
        published: true,
      },
      attributes: { daily_output: 500 },
    });
    createdProductIds.push(product.id);

    const storedProduct = await repository.getPublishedProductBySlug(product.slug);

    expect(storedProduct?.attributes).toContainEqual({
      label: "Producción diaria",
      value: 500,
      unit: "kg/día",
    });

    await expect(
      repository.listPublishedProducts({
        query: "hielo 500",
        categorySlug: category.slug,
      }),
    ).resolves.toContainEqual(
      expect.objectContaining({
        id: product.id,
        slug: product.slug,
      }),
    );
  });

  it("does not expose unpublished products", async () => {
    const suffix = randomUUID();
    const category = await repository.createCategory({
      name: "Equipos industriales",
      slug: `equipos-industriales-${suffix}`,
      parentId: null,
      attributes: [],
    });
    createdCategoryIds.push(category.id);

    const product = await repository.createProduct({
      product: {
        title: "Equipo industrial privado",
        slug: `equipo-industrial-privado-${suffix}`,
        categoryId: category.id,
        purchaseMode: "assisted_contact",
        priceMinor: null,
        summary: "Producto pendiente de publicación.",
        description: "",
        published: false,
      },
      attributes: {},
    });
    createdProductIds.push(product.id);

    await expect(repository.getPublishedProductBySlug(product.slug)).resolves.toBeNull();
    await expect(repository.listPublishedProducts({})).resolves.not.toContainEqual(
      expect.objectContaining({ id: product.id }),
    );
  });
});
