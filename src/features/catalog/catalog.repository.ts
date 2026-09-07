import { and, eq, ilike, inArray, or } from "drizzle-orm";
import type { createDatabase } from "@/db/create-database";
import {
  categories,
  categoryAttributes,
  productAttributeValues,
  products,
} from "@/db/schema/catalog";
import type { AttributeType } from "./catalog.contracts";
import type { CreateCategoryInput, CreateProductInput } from "./catalog.validation";

export type CategoryAttributeRecord = {
  id: string;
  key: string;
  type: AttributeType;
  required: boolean;
  options: string[];
  unit: string | null;
};

export type ProductAttributeValue =
  | string
  | number
  | boolean
  | string[]
  | { value: number; unit: string };

export type PublishedProductSummary = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  purchaseMode: string;
  priceMinor: number | null;
};

export type PublishedProductDetail = PublishedProductSummary & {
  description: string;
  attributes: Array<{
    label: string;
    value: unknown;
    unit: string | null;
  }>;
};

export interface CatalogRepository {
  createCategory(input: CreateCategoryInput): Promise<{ id: string; slug: string }>;
  getCategoryWithAttributes(
    id: string,
  ): Promise<{ id: string; attributes: CategoryAttributeRecord[] } | null>;
  createProduct(input: {
    product: CreateProductInput;
    attributes: Record<string, ProductAttributeValue>;
  }): Promise<{ id: string; slug: string }>;
  listPublishedProducts(input: {
    query?: string;
    categorySlug?: string;
  }): Promise<PublishedProductSummary[]>;
  getPublishedProductBySlug(slug: string): Promise<PublishedProductDetail | null>;
}

type Database = ReturnType<typeof createDatabase>;

export class DrizzleCatalogRepository implements CatalogRepository {
  constructor(private readonly database: Database) {}

  async createCategory(input: CreateCategoryInput) {
    return this.database.transaction(async (transaction) => {
      const [category] = await transaction
        .insert(categories)
        .values({
          name: input.name,
          slug: input.slug,
          parentId: input.parentId,
        })
        .returning({ id: categories.id, slug: categories.slug });

      if (!category) {
        throw new Error("Failed to create category");
      }

      if (input.attributes.length > 0) {
        await transaction.insert(categoryAttributes).values(
          input.attributes.map((attribute) => ({
            categoryId: category.id,
            ...attribute,
          })),
        );
      }

      return category;
    });
  }

  async getCategoryWithAttributes(id: string) {
    const [category] = await this.database
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    if (!category) {
      return null;
    }

    const attributes = await this.database
      .select({
        id: categoryAttributes.id,
        key: categoryAttributes.key,
        type: categoryAttributes.type,
        required: categoryAttributes.required,
        options: categoryAttributes.options,
        unit: categoryAttributes.unit,
      })
      .from(categoryAttributes)
      .where(eq(categoryAttributes.categoryId, category.id));

    return { id: category.id, attributes };
  }

  async createProduct(input: {
    product: CreateProductInput;
    attributes: Record<string, ProductAttributeValue>;
  }) {
    return this.database.transaction(async (transaction) => {
      const [product] = await transaction
        .insert(products)
        .values(input.product)
        .returning({ id: products.id, slug: products.slug });

      if (!product) {
        throw new Error("Failed to create product");
      }

      const attributeEntries = Object.entries(input.attributes);
      if (attributeEntries.length > 0) {
        const attributesByKey = new Map(
          (
            await transaction
              .select({
                id: categoryAttributes.id,
                key: categoryAttributes.key,
              })
              .from(categoryAttributes)
              .where(
                and(
                  eq(categoryAttributes.categoryId, input.product.categoryId),
                  inArray(
                    categoryAttributes.key,
                    attributeEntries.map(([key]) => key),
                  ),
                ),
              )
          ).map((attribute) => [attribute.key, attribute.id]),
        );

        await transaction.insert(productAttributeValues).values(
          attributeEntries.map(([key, value]) => {
            const attributeId = attributesByKey.get(key);
            if (!attributeId) {
              throw new Error(`Attribute ${key} does not belong to the category`);
            }

            return {
              productId: product.id,
              attributeId,
              value,
            };
          }),
        );
      }

      return product;
    });
  }

  async listPublishedProducts(input: {
    query?: string;
    categorySlug?: string;
  }): Promise<PublishedProductSummary[]> {
    const conditions = [eq(products.published, true)];

    if (input.query) {
      conditions.push(
        or(
          ilike(products.title, `%${input.query}%`),
          ilike(products.summary, `%${input.query}%`),
        )!,
      );
    }
    if (input.categorySlug) {
      conditions.push(eq(categories.slug, input.categorySlug));
    }

    return this.database
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        summary: products.summary,
        purchaseMode: products.purchaseMode,
        priceMinor: products.priceMinor,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions));
  }

  async getPublishedProductBySlug(
    slug: string,
  ): Promise<PublishedProductDetail | null> {
    const [product] = await this.database
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        summary: products.summary,
        description: products.description,
        purchaseMode: products.purchaseMode,
        priceMinor: products.priceMinor,
      })
      .from(products)
      .where(and(eq(products.slug, slug), eq(products.published, true)))
      .limit(1);

    if (!product) {
      return null;
    }

    const attributes = await this.database
      .select({
        label: categoryAttributes.label,
        value: productAttributeValues.value,
        unit: categoryAttributes.unit,
      })
      .from(productAttributeValues)
      .innerJoin(
        categoryAttributes,
        eq(productAttributeValues.attributeId, categoryAttributes.id),
      )
      .where(eq(productAttributeValues.productId, product.id));

    return { ...product, attributes };
  }
}
