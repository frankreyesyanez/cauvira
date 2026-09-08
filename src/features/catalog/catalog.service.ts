import { z } from "zod";
import type {
  CatalogRepository,
  CategoryAttributeRecord,
  ProductAttributeValue,
} from "./catalog.repository";
import { createCategorySchema, createProductSchema } from "./catalog.validation";

const isoDateSchema = z.iso.date();

export class CatalogInputError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
    this.name = "CatalogInputError";
  }
}

const invalidAttributeValue = (key: string): never => {
  throw new Error(`Invalid value for attribute ${key}`);
};

const validateAttributeValue = (
  attribute: CategoryAttributeRecord,
  value: unknown,
): ProductAttributeValue => {
  switch (attribute.type) {
    case "text":
      return typeof value === "string"
        ? value
        : invalidAttributeValue(attribute.key);
    case "number":
      return typeof value === "number" && Number.isFinite(value)
        ? value
        : invalidAttributeValue(attribute.key);
    case "boolean":
      return typeof value === "boolean"
        ? value
        : invalidAttributeValue(attribute.key);
    case "select":
      return typeof value === "string" && attribute.options.includes(value)
        ? value
        : invalidAttributeValue(attribute.key);
    case "multiselect":
      return Array.isArray(value) &&
        value.every(
          (option): option is string =>
            typeof option === "string" && attribute.options.includes(option),
        )
        ? value
        : invalidAttributeValue(attribute.key);
    case "date": {
      const parsedDate = isoDateSchema.safeParse(value);
      return parsedDate.success
        ? parsedDate.data
        : invalidAttributeValue(attribute.key);
    }
    case "measurement": {
      if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value) ||
        Object.keys(value).some((key) => key !== "value" && key !== "unit") ||
        !("value" in value) ||
        typeof value.value !== "number" ||
        !Number.isFinite(value.value) ||
        !("unit" in value) ||
        typeof value.unit !== "string" ||
        (attribute.unit !== null && value.unit !== attribute.unit)
      ) {
        return invalidAttributeValue(attribute.key);
      }
      return { value: value.value, unit: value.unit };
    }
    default:
      return invalidAttributeValue(attribute.key);
  }
};

async function assertValidParent(
  repository: CatalogRepository,
  parentId: string | null,
  categoryId?: string,
) {
  if (!parentId) return;
  if (parentId === categoryId) {
    throw new CatalogInputError("parentId", "Una categoría no puede ser su propia superior.");
  }
  const categories = await repository.listCategories();
  const byId = new Map(categories.map((category) => [category.id, category]));
  if (!byId.has(parentId)) {
    throw new CatalogInputError("parentId", "La categoría superior no existe.");
  }
  let current = byId.get(parentId);
  while (current) {
    if (current.id === categoryId) {
      throw new CatalogInputError("parentId", "La categoría superior produciría un ciclo.");
    }
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
}

async function validateProductInput(
  repository: CatalogRepository,
  input: { product: unknown; attributes: Record<string, unknown> },
) {
  const product = createProductSchema.parse(input.product);
  const category = await repository.getCategoryWithAttributes(product.categoryId);

  if (!category) {
    throw new CatalogInputError("categoryId", "Category not found");
  }

  const attributesByKey = new Map(
    category.attributes.map((attribute) => [attribute.key, attribute]),
  );
  const attributes: Record<string, ProductAttributeValue> = {};
  for (const [key, value] of Object.entries(input.attributes)) {
    const attribute = attributesByKey.get(key);
    if (!attribute) {
      throw new Error(`Attribute ${key} does not belong to the category`);
    }
    attributes[key] = validateAttributeValue(attribute, value);
  }

  for (const attribute of category.attributes) {
    if (attribute.required && input.attributes[attribute.key] == null) {
      throw new Error(`Required attribute missing: ${attribute.key}`);
    }
  }
  return { product, attributes };
}

export const createCatalogService = (repository: CatalogRepository) => ({
  async createCategory(input: unknown) {
    const category = createCategorySchema.parse(input);
    await assertValidParent(repository, category.parentId);
    return repository.createCategory(category);
  },

  async updateCategory(id: string, input: unknown) {
    const category = createCategorySchema.parse(input);
    await assertValidParent(repository, category.parentId, id);
    return repository.updateCategory(id, category);
  },

  getCategoryWithAttributes(id: string) {
    return repository.getCategoryWithAttributes(id);
  },

  listCategories() {
    return repository.listCategories();
  },

  listAdminProducts(input: {
    query?: string;
    categoryId?: string;
    status?: "published" | "draft";
  }) {
    return repository.listAdminProducts(input);
  },

  getAdminProductById(id: string) {
    return repository.getAdminProductById(id);
  },

  async createProduct(input: {
    product: unknown;
    attributes: Record<string, unknown>;
  }) {
    return repository.createProduct(await validateProductInput(repository, input));
  },

  async updateProduct(
    id: string,
    input: {
      product: unknown;
      attributes: Record<string, unknown>;
    },
  ) {
    return repository.updateProduct(
      id,
      await validateProductInput(repository, input),
    );
  },

  listPublishedProducts(input: { query?: string; categorySlug?: string }) {
    return repository.listPublishedProducts(input);
  },

  getPublishedProductBySlug(slug: string) {
    return repository.getPublishedProductBySlug(slug);
  },
});
