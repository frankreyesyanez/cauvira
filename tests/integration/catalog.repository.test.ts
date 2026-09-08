import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { createDatabase } from "@/db/create-database";
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
    await expect(
      repository.listPublishedProducts({
        query: "resultado-inexistente",
        categorySlug: category.slug,
      }),
    ).resolves.not.toContainEqual(expect.objectContaining({ id: product.id }));
    await expect(
      repository.listPublishedProducts({
        query: "hielo 500",
        categorySlug: `otra-categoria-${suffix}`,
      }),
    ).resolves.not.toContainEqual(expect.objectContaining({ id: product.id }));

    await expect(repository.listCategories()).resolves.toContainEqual(
      expect.objectContaining({
        id: category.id,
        attributes: [
          expect.objectContaining({
            key: "daily_output",
            label: "Producción diaria",
          }),
        ],
      }),
    );
    await expect(
      repository.listAdminProducts({
        query: "hielo 500",
        categoryId: category.id,
        status: "published",
      }),
    ).resolves.toContainEqual(
      expect.objectContaining({
        id: product.id,
        categoryName: "Máquinas de hielo",
        published: true,
      }),
    );
    await expect(
      repository.listAdminProducts({ status: "draft" }),
    ).resolves.not.toContainEqual(expect.objectContaining({ id: product.id }));
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
    await expect(
      repository.listAdminProducts({ status: "draft" }),
    ).resolves.toContainEqual(
      expect.objectContaining({
        id: product.id,
        published: false,
      }),
    );
  });

  it("rolls back product creation when an attribute is outside its category", async () => {
    const suffix = randomUUID();
    const category = await repository.createCategory({
      name: "Equipos sin atributos",
      slug: `equipos-sin-atributos-${suffix}`,
      parentId: null,
      attributes: [],
    });
    createdCategoryIds.push(category.id);
    const slug = `producto-con-atributo-invalido-${suffix}`;

    await expect(
      repository.createProduct({
        product: {
          title: "Producto con atributo inválido",
          slug,
          categoryId: category.id,
          purchaseMode: "quotation",
          priceMinor: null,
          summary: "Producto usado para comprobar la transacción.",
          description: "",
          published: false,
        },
        attributes: { outside_category: "invalid" },
      }),
    ).rejects.toThrow(/outside_category/);

    const persistedProducts = await testDb
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug));
    createdProductIds.push(...persistedProducts.map(({ id }) => id));

    expect(persistedProducts).toEqual([]);
  });
});
