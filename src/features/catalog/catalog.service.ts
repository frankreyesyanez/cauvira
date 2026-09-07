import type { CatalogRepository } from "./catalog.repository";
import { createCategorySchema, createProductSchema } from "./catalog.validation";

export const createCatalogService = (repository: CatalogRepository) => ({
  async createCategory(input: unknown) {
    return repository.createCategory(createCategorySchema.parse(input));
  },

  async createProduct(input: {
    product: unknown;
    attributes: Record<string, unknown>;
  }) {
    const product = createProductSchema.parse(input.product);
    const category = await repository.getCategoryWithAttributes(product.categoryId);

    if (!category) {
      throw new Error("Category not found");
    }

    const allowedAttributes = new Set(
      category.attributes.map((attribute) => attribute.key),
    );
    for (const key of Object.keys(input.attributes)) {
      if (!allowedAttributes.has(key)) {
        throw new Error(`Attribute ${key} does not belong to the category`);
      }
    }

    for (const attribute of category.attributes) {
      if (attribute.required && input.attributes[attribute.key] == null) {
        throw new Error(`Required attribute missing: ${attribute.key}`);
      }
    }

    return repository.createProduct({ product, attributes: input.attributes });
  },

  listPublishedProducts(input: { query?: string; categorySlug?: string }) {
    return repository.listPublishedProducts(input);
  },

  getPublishedProductBySlug(slug: string) {
    return repository.getPublishedProductBySlug(slug);
  },
});
