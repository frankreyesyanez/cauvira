import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { createDatabase } from "@/db/create-database";
import {
  categories,
  productAttributeValues,
  productImages,
  products,
} from "@/db/schema/catalog";
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
  for (const id of createdCategoryIds.splice(0).reverse()) {
    await testDb.delete(categories).where(eq(categories.id, id));
  }
});

describe("DrizzleCatalogRepository", () => {
  it("enforces category parent integrity at the database boundary", async () => {
    const suffix = randomUUID();
    const slug = `categoria-huerfana-${suffix}`;
    await testDb
      .delete(categories)
      .where(eq(categories.name, "Categoría huérfana"));

    try {
      await expect(repository.createCategory({
        name: "Categoría huérfana",
        slug,
        parentId: randomUUID(),
        attributes: [],
      })).rejects.toThrow();
    } finally {
      await testDb.delete(categories).where(eq(categories.slug, slug));
    }
  });

  it("loads two-level inherited attributes root-to-child with child overrides", async () => {
    const suffix = randomUUID();
    const root = await repository.createCategory({
      name: "Maquinaria",
      slug: `maquinaria-${suffix}`,
      parentId: null,
      attributes: [{
        key: "capacity",
        label: "Capacidad",
        type: "number",
        required: true,
        filterable: true,
        comparable: true,
        unit: null,
        options: [],
      }],
    });
    createdCategoryIds.push(root.id);
    const middle = await repository.createCategory({
      name: "Refrigeración",
      slug: `refrigeracion-${suffix}`,
      parentId: root.id,
      attributes: [{
        key: "voltage",
        label: "Voltaje heredado",
        type: "text",
        required: false,
        filterable: false,
        comparable: true,
        unit: null,
        options: [],
      }],
    });
    createdCategoryIds.push(middle.id);
    const child = await repository.createCategory({
      name: "Máquinas de hielo",
      slug: `maquinas-heredadas-${suffix}`,
      parentId: middle.id,
      attributes: [
        {
          key: "voltage",
          label: "Voltaje nominal",
          type: "number",
          required: true,
          filterable: true,
          comparable: true,
          unit: null,
          options: [],
        },
        {
          key: "daily_output",
          label: "Producción diaria",
          type: "measurement",
          required: true,
          filterable: true,
          comparable: true,
          unit: "kg/día",
          options: [],
        },
      ],
    });
    createdCategoryIds.push(child.id);

    const loaded = await repository.getCategoryWithAttributes(child.id);
    expect(loaded?.attributes.map(({ key }) => key)).toEqual([
      "capacity",
      "voltage",
      "daily_output",
    ]);
    expect(loaded?.attributes[1]).toEqual(
      expect.objectContaining({
        label: "Voltaje nominal",
        type: "number",
      }),
    );

    const product = await repository.createProduct({
      product: {
        title: "Máquina con ficha heredada",
        slug: `maquina-ficha-heredada-${suffix}`,
        categoryId: child.id,
        purchaseMode: "quotation",
        priceMinor: 1_000_000,
        summary: "Producto con atributos de tres niveles.",
        description: "",
        published: false,
        optionGroups: [],
      },
      attributes: {
        capacity: 500,
        voltage: 220,
        daily_output: { value: 1000, unit: "kg/día" },
      },
    });
    createdProductIds.push(product.id);

    await expect(repository.listAdminProducts({ status: "draft" })).resolves.toContainEqual(
      expect.objectContaining({ id: product.id }),
    );

    await expect(
      repository.updateCategory(child.id, {
        name: "Máquinas de hielo",
        slug: child.slug,
        parentId: null,
        attributes: [
          {
            key: "voltage",
            label: "Voltaje nominal",
            type: "number",
            required: true,
            filterable: true,
            comparable: true,
            unit: null,
            options: [],
          },
          {
            key: "daily_output",
            label: "Producción diaria",
            type: "measurement",
            required: true,
            filterable: true,
            comparable: true,
            unit: "kg/día",
            options: [],
          },
        ],
      }),
    ).rejects.toThrow(/superior.*productos/i);

    await expect(
      repository.updateCategory(root.id, {
        name: "Maquinaria",
        slug: root.slug,
        parentId: null,
        attributes: [],
      }),
    ).rejects.toThrow(/referenciado/i);

    await expect(
      repository.updateCategory(child.id, {
        name: "Máquinas de hielo",
        slug: child.slug,
        parentId: middle.id,
        attributes: [
          {
            key: "capacity",
            label: "Capacidad incompatible",
            type: "text",
            required: true,
            filterable: true,
            comparable: true,
            unit: null,
            options: [],
          },
          {
            key: "voltage",
            label: "Voltaje nominal",
            type: "number",
            required: true,
            filterable: true,
            comparable: true,
            unit: null,
            options: [],
          },
          {
            key: "daily_output",
            label: "Producción diaria",
            type: "measurement",
            required: true,
            filterable: true,
            comparable: true,
            unit: "kg/día",
            options: [],
          },
        ],
      }),
    ).rejects.toThrow(/heredado.*referenciado/i);

    await repository.updateCategory(root.id, {
      name: "Maquinaria",
      slug: root.slug,
      parentId: null,
      attributes: [{
        key: "capacity",
        label: "Capacidad nominal",
        type: "number",
        required: true,
        filterable: true,
        comparable: true,
        unit: null,
        options: [],
      }],
    });
    expect(
      (await repository.getCategoryWithAttributes(child.id))?.attributes[0],
    ).toEqual(expect.objectContaining({ label: "Capacidad nominal" }));
    expect(
      await testDb
        .select()
        .from(productAttributeValues)
        .where(eq(productAttributeValues.productId, product.id)),
    ).toHaveLength(3);

    await repository.updateProduct(product.id, {
      product: {
        title: "Máquina heredada actualizada",
        slug: `maquina-ficha-actualizada-${suffix}`,
        categoryId: child.id,
        purchaseMode: "starting_price",
        priceMinor: 2_500_000,
        summary: "Producto actualizado con atributos heredados.",
        description: "Edición persistida.",
        published: true,
        optionGroups: [],
      },
      attributes: {
        capacity: 600,
        voltage: 440,
        daily_output: { value: 1200, unit: "kg/día" },
      },
    });
    await expect(repository.getAdminProductById(product.id)).resolves.toEqual(
      expect.objectContaining({
        title: "Máquina heredada actualizada",
        priceMinor: 2_500_000,
        attributes: {
          capacity: 600,
          voltage: 440,
          daily_output: { value: 1200, unit: "kg/día" },
        },
      }),
    );
  }, 20_000);

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
        priceMinor: 4_890_000,
        summary: "Producción industrial para comercios.",
        description: "Equipo de producción continua.",
        published: true,
        optionGroups: [],
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
        priceMinor: 2_500_000,
        summary: "Producto pendiente de publicación.",
        description: "",
        published: false,
        optionGroups: [],
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
          priceMinor: 1_000_000,
          summary: "Producto usado para comprobar la transacción.",
          description: "",
          published: false,
          optionGroups: [],
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

  it("persists option groups and reports hasOptions on published reads", async () => {
    const suffix = randomUUID();
    const category = await repository.createCategory({
      name: "Ropa de trabajo",
      slug: `ropa-trabajo-${suffix}`,
      parentId: null,
      attributes: [],
    });
    createdCategoryIds.push(category.id);

    const sized = await repository.createProduct({
      product: {
        title: "Overol industrial",
        slug: `overol-industrial-${suffix}`,
        categoryId: category.id,
        purchaseMode: "direct_purchase",
        priceMinor: 89_900,
        summary: "Overol con talla seleccionable para planta.",
        description: "Prenda de trabajo con opciones de talla.",
        published: true,
        optionGroups: [
          {
            name: "Talla",
            required: true,
            sortOrder: 0,
            values: [
              {
                label: "M",
                priceDeltaMinor: 0,
                sortOrder: 0,
              },
            ],
          },
        ],
      },
      attributes: {},
    });
    createdProductIds.push(sized.id);

    const admin = await repository.getAdminProductById(sized.id);
    expect(admin?.optionGroups).toEqual([
      expect.objectContaining({
        id: expect.any(String),
        name: "Talla",
        required: true,
        sortOrder: 0,
        values: [
          expect.objectContaining({
            id: expect.any(String),
            label: "M",
            priceDeltaMinor: 0,
            sortOrder: 0,
          }),
        ],
      }),
    ]);

    const published = await repository.getPublishedProductBySlug(sized.slug);
    expect(published?.hasOptions).toBe(true);
    expect(published?.optionGroups).toEqual(admin?.optionGroups);
    expect(published?.images).toEqual([]);

    const plain = await repository.createProduct({
      product: {
        title: "Overol liso",
        slug: `overol-liso-${suffix}`,
        categoryId: category.id,
        purchaseMode: "direct_purchase",
        priceMinor: 79_900,
        summary: "Overol sin variantes de talla disponibles.",
        description: "",
        published: true,
        optionGroups: [],
      },
      attributes: {},
    });
    createdProductIds.push(plain.id);

    await expect(repository.getPublishedProductBySlug(plain.slug)).resolves.toEqual(
      expect.objectContaining({
        id: plain.id,
        hasOptions: false,
        optionGroups: [],
        images: [],
      }),
    );
    await expect(
      repository.listPublishedProducts({ categorySlug: category.slug }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: sized.id, hasOptions: true, images: [] }),
        expect.objectContaining({ id: plain.id, hasOptions: false, images: [] }),
      ]),
    );
  });

  it("replaces option groups on update without deleting product images", async () => {
    const suffix = randomUUID();
    const category = await repository.createCategory({
      name: "Uniformes",
      slug: `uniformes-${suffix}`,
      parentId: null,
      attributes: [],
    });
    createdCategoryIds.push(category.id);

    const product = await repository.createProduct({
      product: {
        title: "Camisa de trabajo",
        slug: `camisa-trabajo-${suffix}`,
        categoryId: category.id,
        purchaseMode: "direct_purchase",
        priceMinor: 45_900,
        summary: "Camisa con opciones de talla y color.",
        description: "",
        published: true,
        optionGroups: [
          {
            name: "Talla",
            required: true,
            sortOrder: 0,
            values: [{ label: "M", priceDeltaMinor: 0, sortOrder: 0 }],
          },
        ],
      },
      attributes: {},
    });
    createdProductIds.push(product.id);

    await testDb.insert(productImages).values({
      productId: product.id,
      url: "/catalog/camisa-trabajo.jpg",
      sortOrder: 0,
    });

    await repository.updateProduct(product.id, {
      product: {
        title: "Camisa de trabajo",
        slug: `camisa-trabajo-${suffix}`,
        categoryId: category.id,
        purchaseMode: "direct_purchase",
        priceMinor: 45_900,
        summary: "Camisa con opciones de talla y color.",
        description: "",
        published: true,
        optionGroups: [
          {
            name: "Color",
            required: true,
            sortOrder: 0,
            values: [{ label: "Rojo", priceDeltaMinor: 0, sortOrder: 0 }],
          },
        ],
      },
      attributes: {},
    });

    const admin = await repository.getAdminProductById(product.id);
    expect(admin?.optionGroups).toEqual([
      expect.objectContaining({
        name: "Color",
        values: [expect.objectContaining({ label: "Rojo", priceDeltaMinor: 0 })],
      }),
    ]);
    expect(admin?.optionGroups.some((group) => group.name === "Talla")).toBe(false);
    expect(admin?.images).toEqual([
      expect.objectContaining({
        url: "/catalog/camisa-trabajo.jpg",
        sortOrder: 0,
      }),
    ]);
  });
});
