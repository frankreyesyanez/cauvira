import { z } from "zod";
import type {
  CatalogRepository,
  CategoryAttributeRecord,
  ProductAttributeValue,
} from "./catalog.repository";
import { createCategorySchema, createProductSchema } from "./catalog.validation";

const isoDateSchema = z.iso.date();

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

    return repository.createProduct({ product, attributes });
  },

  listPublishedProducts(input: { query?: string; categorySlug?: string }) {
    return repository.listPublishedProducts(input);
  },

  getPublishedProductBySlug(slug: string) {
    return repository.getPublishedProductBySlug(slug);
  },
});
