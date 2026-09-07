import { describe, expect, it, vi } from "vitest";
import { createCatalogService } from "@/features/catalog/catalog.service";
import type { CatalogRepository } from "@/features/catalog/catalog.repository";

const categoryId = "3d03a1c7-7ca0-44e0-8fcb-1ec03f5d48d0";

const product = {
  title: "Máquina de hielo 500 kg",
  slug: "maquina-hielo-500-kg",
  categoryId,
  purchaseMode: "quotation",
  priceMinor: null,
  summary: "Producción industrial para comercios.",
  description: "",
  published: false,
};

const createRepository = (overrides: Partial<CatalogRepository> = {}) => ({
  createCategory: vi.fn(),
  getCategoryWithAttributes: vi.fn().mockResolvedValue({
    id: categoryId,
    attributes: [
      {
        id: "a1",
        key: "daily_output",
        required: true,
        type: "number",
        options: [],
        unit: null,
      },
    ],
  }),
  createProduct: vi.fn().mockResolvedValue({
    id: "f6016d3e-c6a1-4db6-98e1-42f026bc0ca0",
    slug: product.slug,
  }),
  listPublishedProducts: vi.fn(),
  getPublishedProductBySlug: vi.fn(),
  ...overrides,
}) as unknown as CatalogRepository;

describe("createCatalogService", () => {
  it("rejects a product missing a required category attribute", async () => {
    const service = createCatalogService(createRepository());

    await expect(service.createProduct({ product, attributes: {} })).rejects.toThrow(
      /daily_output/,
    );
  });

  it("rejects an attribute outside the selected category", async () => {
    const service = createCatalogService(createRepository());

    await expect(
      service.createProduct({
        product,
        attributes: { daily_output: 500, voltage: 220 },
      }),
    ).rejects.toThrow(/voltage/);
  });

  it("rejects products for a missing category", async () => {
    const repository = createRepository({
      getCategoryWithAttributes: vi.fn().mockResolvedValue(null),
    });
    const service = createCatalogService(repository);

    await expect(
      service.createProduct({ product, attributes: { daily_output: 500 } }),
    ).rejects.toThrow(/Category not found/);
  });

  it("validates and creates a product with category attributes", async () => {
    const repository = createRepository();
    const service = createCatalogService(repository);

    await service.createProduct({
      product: { ...product, title: "  Máquina de hielo 500 kg  " },
      attributes: { daily_output: 500 },
    });

    expect(repository.createProduct).toHaveBeenCalledWith({
      product: { ...product, title: "Máquina de hielo 500 kg" },
      attributes: { daily_output: 500 },
    });
  });

  it("validates category input before persistence", async () => {
    const repository = createRepository();
    const service = createCatalogService(repository);

    await expect(
      service.createCategory({
        name: "A",
        slug: "invalid slug",
        attributes: [],
      }),
    ).rejects.toThrow();
    expect(repository.createCategory).not.toHaveBeenCalled();
  });

  it("delegates published catalog queries", async () => {
    const repository = createRepository();
    const service = createCatalogService(repository);
    const filters = { query: "hielo", categorySlug: "maquinaria" };

    await service.listPublishedProducts(filters);
    await service.getPublishedProductBySlug(product.slug);

    expect(repository.listPublishedProducts).toHaveBeenCalledWith(filters);
    expect(repository.getPublishedProductBySlug).toHaveBeenCalledWith(product.slug);
  });

  describe.each([
    {
      type: "text",
      valid: "Acero inoxidable",
      invalid: 500,
      options: [],
      unit: null,
    },
    { type: "number", valid: 500, invalid: "500", options: [], unit: null },
    { type: "boolean", valid: true, invalid: "true", options: [], unit: null },
    {
      type: "select",
      valid: "automatic",
      invalid: 1,
      options: ["automatic", "manual"],
      unit: null,
    },
    {
      type: "multiselect",
      valid: ["ice", "water"],
      invalid: "ice",
      options: ["ice", "water"],
      unit: null,
    },
    {
      type: "date",
      valid: "2026-09-07",
      invalid: "September 7",
      options: [],
      unit: null,
    },
    {
      type: "measurement",
      valid: { value: 500, unit: "kg/día" },
      invalid: { value: "500", unit: "kg/día" },
      options: [],
      unit: "kg/día",
    },
  ])("$type dynamic attributes", ({ type, valid, invalid, options, unit }) => {
    const createTypedRepository = () =>
      createRepository({
        getCategoryWithAttributes: vi.fn().mockResolvedValue({
          id: categoryId,
          attributes: [
            {
              id: "attribute-1",
              key: "specification",
              required: true,
              type,
              options,
              unit,
            },
          ],
        }),
      });

    it("accepts a valid value", async () => {
      const repository = createTypedRepository();
      const service = createCatalogService(repository);

      await service.createProduct({
        product,
        attributes: { specification: valid },
      });

      expect(repository.createProduct).toHaveBeenCalledWith({
        product,
        attributes: { specification: valid },
      });
    });

    it("rejects an invalid value and names its key", async () => {
      const service = createCatalogService(createTypedRepository());

      await expect(
        service.createProduct({
          product,
          attributes: { specification: invalid },
        }),
      ).rejects.toThrow(/specification/);
    });
  });

  it.each([
    {
      type: "select",
      value: "unsupported",
      options: ["automatic", "manual"],
      unit: null,
    },
    {
      type: "multiselect",
      value: ["ice", "unsupported"],
      options: ["ice", "water"],
      unit: null,
    },
    {
      type: "measurement",
      value: { value: 500, unit: "lb/day" },
      options: [],
      unit: "kg/día",
    },
  ])("rejects invalid $type declarations and names the key", async (attribute) => {
    const repository = createRepository({
      getCategoryWithAttributes: vi.fn().mockResolvedValue({
        id: categoryId,
        attributes: [
          {
            id: "attribute-1",
            key: "specification",
            required: false,
            ...attribute,
          },
        ],
      }),
    });
    const service = createCatalogService(repository);

    await expect(
      service.createProduct({
        product,
        attributes: { specification: attribute.value },
      }),
    ).rejects.toThrow(/specification/);
  });

  it("rejects a supplied null value for an optional attribute", async () => {
    const repository = createRepository({
      getCategoryWithAttributes: vi.fn().mockResolvedValue({
        id: categoryId,
        attributes: [
          {
            id: "attribute-1",
            key: "specification",
            required: false,
            type: "text",
            options: [],
            unit: null,
          },
        ],
      }),
    });
    const service = createCatalogService(repository);

    await expect(
      service.createProduct({
        product,
        attributes: { specification: null },
      }),
    ).rejects.toThrow(/specification/);
  });
});
