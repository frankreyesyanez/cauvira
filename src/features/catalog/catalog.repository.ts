import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import type { createDatabase } from "@/db/create-database";
import {
  categories,
  categoryAttributes,
  productAttributeValues,
  productImages,
  productOptionGroups,
  productOptionValues,
  products,
} from "@/db/schema/catalog";
import type { AttributeType, PurchaseMode } from "./catalog.contracts";
import type { CreateCategoryInput, CreateProductInput } from "./catalog.validation";
import type { CatalogOptionGroup } from "./pricing";

export type CategoryAttributeRecord = {
  id: string;
  key: string;
  label: string;
  type: AttributeType;
  required: boolean;
  filterable: boolean;
  comparable: boolean;
  options: string[];
  unit: string | null;
};

export type AdminCategorySummary = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  attributes: CategoryAttributeRecord[];
  ownAttributes: CategoryAttributeRecord[];
};

export type AdminProductSummary = {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  purchaseMode: PurchaseMode;
  priceMinor: number;
  published: boolean;
  updatedAt: Date;
};

export type ProductImageRecord = { id: string; url: string; sortOrder: number };

export type AdminProductDetail = AdminProductSummary & {
  summary: string;
  description: string;
  attributes: Record<string, ProductAttributeValue>;
  optionGroups: CatalogOptionGroup[];
  images: ProductImageRecord[];
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
  priceMinor: number;
  hasOptions: boolean;
  images: ProductImageRecord[];
};

export type PublishedProductDetail = PublishedProductSummary & {
  description: string;
  attributes: Array<{
    label: string;
    value: unknown;
    unit: string | null;
  }>;
  optionGroups: CatalogOptionGroup[];
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
  updateCategory(
    id: string,
    input: CreateCategoryInput,
  ): Promise<{ id: string; slug: string }>;
  updateProduct(
    id: string,
    input: {
      product: CreateProductInput;
      attributes: Record<string, ProductAttributeValue>;
    },
  ): Promise<{ id: string; slug: string }>;
  getAdminProductById(id: string): Promise<AdminProductDetail | null>;
  listCategories(): Promise<AdminCategorySummary[]>;
  listAdminProducts(input: {
    query?: string;
    categoryId?: string;
    status?: "published" | "draft";
  }): Promise<AdminProductSummary[]>;
  listPublishedProducts(input: {
    query?: string;
    categorySlug?: string;
  }): Promise<PublishedProductSummary[]>;
  getPublishedProductBySlug(slug: string): Promise<PublishedProductDetail | null>;
  getPublishedProductById(id: string): Promise<PublishedProductDetail | null>;
  setProductImages(productId: string, urls: string[]): Promise<void>;
}

type Database = ReturnType<typeof createDatabase>;

type CategoryNode = { id: string; parentId: string | null };
type OwnedCategoryAttribute = CategoryAttributeRecord & { categoryId: string };

function buildCategoryMaps(
  categoryRows: CategoryNode[],
  attributeRows: OwnedCategoryAttribute[],
) {
  const categoriesById = new Map(categoryRows.map((category) => [category.id, category]));
  const attributesByCategory = new Map<string, CategoryAttributeRecord[]>();
  for (const attribute of attributeRows) {
    const current = attributesByCategory.get(attribute.categoryId) ?? [];
    current.push({
      id: attribute.id,
      key: attribute.key,
      label: attribute.label,
      type: attribute.type,
      required: attribute.required,
      filterable: attribute.filterable,
      comparable: attribute.comparable,
      options: attribute.options,
      unit: attribute.unit,
    });
    attributesByCategory.set(attribute.categoryId, current);
  }
  return { categoriesById, attributesByCategory };
}

function resolveFromMaps(
  categoryId: string,
  categoriesById: Map<string, CategoryNode>,
  attributesByCategory: Map<string, CategoryAttributeRecord[]>,
) {
  const path: string[] = [];
  const visited = new Set<string>();
  let current = categoriesById.get(categoryId);
  while (current) {
    if (visited.has(current.id)) throw new Error("Category hierarchy contains a cycle");
    visited.add(current.id);
    path.unshift(current.id);
    current = current.parentId ? categoriesById.get(current.parentId) : undefined;
  }

  const effective = new Map<string, CategoryAttributeRecord>();
  for (const id of path) {
    for (const attribute of attributesByCategory.get(id) ?? []) {
      effective.set(attribute.key, attribute);
    }
  }
  return [...effective.values()];
}

const FOLD_FROM = "áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ";
const FOLD_TO = "aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC";

function foldedSearchPattern(query: string) {
  return `%${query.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()}%`;
}

function foldedIlike(column: SQLWrapper, query: string): SQL {
  return sql`translate(lower(${column}), ${FOLD_FROM}, ${FOLD_TO}) like ${foldedSearchPattern(query)}`;
}

export function resolveCategoryAttributes(
  categoryId: string,
  categoryRows: CategoryNode[],
  attributeRows: OwnedCategoryAttribute[],
) {
  const maps = buildCategoryMaps(categoryRows, attributeRows);
  return resolveFromMaps(categoryId, maps.categoriesById, maps.attributesByCategory);
}

type CatalogWriter = Pick<Database, "insert" | "delete">;
type CatalogReader = Pick<Database, "select">;

async function replaceProductOptionGroups(
  writer: CatalogWriter,
  productId: string,
  groups: CreateProductInput["optionGroups"],
) {
  await writer
    .delete(productOptionGroups)
    .where(eq(productOptionGroups.productId, productId));

  for (const group of groups) {
    const [insertedGroup] = await writer
      .insert(productOptionGroups)
      .values({
        ...(group.id ? { id: group.id } : {}),
        productId,
        name: group.name,
        required: group.required,
        sortOrder: group.sortOrder,
      })
      .returning({ id: productOptionGroups.id });

    if (!insertedGroup) {
      throw new Error("Failed to create product option group");
    }

    await writer.insert(productOptionValues).values(
      group.values.map((value) => ({
        ...(value.id ? { id: value.id } : {}),
        groupId: insertedGroup.id,
        label: value.label,
        priceDeltaMinor: value.priceDeltaMinor,
        sortOrder: value.sortOrder,
      })),
    );
  }
}

async function loadOptionGroups(
  reader: CatalogReader,
  productId: string,
): Promise<CatalogOptionGroup[]> {
  const groups = await reader
    .select({
      id: productOptionGroups.id,
      name: productOptionGroups.name,
      required: productOptionGroups.required,
      sortOrder: productOptionGroups.sortOrder,
    })
    .from(productOptionGroups)
    .where(eq(productOptionGroups.productId, productId))
    .orderBy(asc(productOptionGroups.sortOrder), asc(productOptionGroups.id));

  if (groups.length === 0) {
    return [];
  }

  const values = await reader
    .select({
      id: productOptionValues.id,
      groupId: productOptionValues.groupId,
      label: productOptionValues.label,
      priceDeltaMinor: productOptionValues.priceDeltaMinor,
      sortOrder: productOptionValues.sortOrder,
    })
    .from(productOptionValues)
    .where(
      inArray(
        productOptionValues.groupId,
        groups.map((group) => group.id),
      ),
    )
    .orderBy(asc(productOptionValues.sortOrder), asc(productOptionValues.id));

  const valuesByGroup = new Map<string, CatalogOptionGroup["values"]>();
  for (const value of values) {
    const current = valuesByGroup.get(value.groupId) ?? [];
    current.push({
      id: value.id,
      label: value.label,
      priceDeltaMinor: value.priceDeltaMinor,
      sortOrder: value.sortOrder,
    });
    valuesByGroup.set(value.groupId, current);
  }

  return groups.map((group) => ({
    ...group,
    values: valuesByGroup.get(group.id) ?? [],
  }));
}

async function loadProductImages(
  reader: CatalogReader,
  productId: string,
): Promise<ProductImageRecord[]> {
  return reader
    .select({
      id: productImages.id,
      url: productImages.url,
      sortOrder: productImages.sortOrder,
    })
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.sortOrder), asc(productImages.id));
}

async function loadImagesByProductIds(
  reader: CatalogReader,
  productIds: string[],
): Promise<Map<string, ProductImageRecord[]>> {
  const imagesByProduct = new Map<string, ProductImageRecord[]>();
  for (const id of productIds) {
    imagesByProduct.set(id, []);
  }
  if (productIds.length === 0) {
    return imagesByProduct;
  }

  const rows = await reader
    .select({
      id: productImages.id,
      productId: productImages.productId,
      url: productImages.url,
      sortOrder: productImages.sortOrder,
    })
    .from(productImages)
    .where(inArray(productImages.productId, productIds))
    .orderBy(asc(productImages.sortOrder), asc(productImages.id));

  for (const row of rows) {
    imagesByProduct.get(row.productId)?.push({
      id: row.id,
      url: row.url,
      sortOrder: row.sortOrder,
    });
  }
  return imagesByProduct;
}

async function loadProductIdsWithOptions(
  reader: CatalogReader,
  productIds: string[],
): Promise<Set<string>> {
  if (productIds.length === 0) {
    return new Set();
  }

  const rows = await reader
    .select({ productId: productOptionGroups.productId })
    .from(productOptionGroups)
    .where(inArray(productOptionGroups.productId, productIds));

  return new Set(rows.map((row) => row.productId));
}

async function loadPublishedProductDetail(
  reader: CatalogReader,
  where: ReturnType<typeof and>,
): Promise<PublishedProductDetail | null> {
  const [product] = await reader
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
    .where(where)
    .limit(1);

  if (!product) {
    return null;
  }

  const attributes = await reader
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

  const [optionGroups, images] = await Promise.all([
    loadOptionGroups(reader, product.id),
    loadProductImages(reader, product.id),
  ]);

  return {
    ...product,
    attributes,
    optionGroups,
    images,
    hasOptions: optionGroups.length > 0,
  };
}

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

  async updateCategory(id: string, input: CreateCategoryInput) {
    return this.database.transaction(async (transaction) => {
      const existingAttributes = await transaction
        .select()
        .from(categoryAttributes)
        .where(eq(categoryAttributes.categoryId, id));
      const categoryRows = await transaction
        .select({ id: categories.id, parentId: categories.parentId })
        .from(categories);
      const currentCategory = categoryRows.find((category) => category.id === id);
      if (!currentCategory) throw new Error("Category not found");
      const childrenByParent = new Map<string, string[]>();
      for (const category of categoryRows) {
        if (!category.parentId) continue;
        const children = childrenByParent.get(category.parentId) ?? [];
        children.push(category.id);
        childrenByParent.set(category.parentId, children);
      }
      const descendants = new Set([id]);
      const pending = [id];
      while (pending.length) {
        const parentId = pending.pop()!;
        for (const childId of childrenByParent.get(parentId) ?? []) {
          descendants.add(childId);
          pending.push(childId);
        }
      }
      const [existingProduct] = await transaction
        .select({ id: products.id })
        .from(products)
        .where(inArray(products.categoryId, [...descendants]))
        .limit(1);
      if (currentCategory.parentId !== input.parentId && existingProduct) {
        throw new Error(
          "No se puede cambiar la categoría superior mientras existan productos en esta rama.",
        );
      }
      const allAttributeRows = await transaction
        .select({
          id: categoryAttributes.id,
          categoryId: categoryAttributes.categoryId,
          key: categoryAttributes.key,
          label: categoryAttributes.label,
          type: categoryAttributes.type,
          required: categoryAttributes.required,
          filterable: categoryAttributes.filterable,
          comparable: categoryAttributes.comparable,
          options: categoryAttributes.options,
          unit: categoryAttributes.unit,
        })
        .from(categoryAttributes)
        .orderBy(categoryAttributes.key);
      const currentEffectiveByKey = new Map(
        resolveCategoryAttributes(id, categoryRows, allAttributeRows).map(
          (attribute) => [attribute.key, attribute],
        ),
      );
      const referencedIds = existingAttributes.length
        ? new Set(
            (
              await transaction
                .select({ attributeId: productAttributeValues.attributeId })
                .from(productAttributeValues)
                .where(
                  inArray(
                    productAttributeValues.attributeId,
                    existingAttributes.map((attribute) => attribute.id),
                  ),
                )
            ).map(({ attributeId }) => attributeId),
          )
        : new Set<string>();
      const nextByKey = new Map(input.attributes.map((attribute) => [attribute.key, attribute]));
      if (
        existingProduct &&
        input.attributes.some(
          (attribute) =>
            attribute.required &&
            currentEffectiveByKey.get(attribute.key)?.required !== true,
        )
      ) {
        throw new Error(
          "No se puede agregar un atributo obligatorio mientras existan productos en esta rama.",
        );
      }

      if (input.parentId) {
        const inheritedByKey = new Map(
          resolveCategoryAttributes(
            input.parentId,
            categoryRows,
            allAttributeRows,
          ).map((attribute) => [attribute.key, attribute]),
        );
        const newOverrides = input.attributes
          .filter(
            (attribute) =>
              !existingAttributes.some((existing) => existing.key === attribute.key) &&
              inheritedByKey.has(attribute.key),
          )
          .map((attribute) => inheritedByKey.get(attribute.key)!);
        if (newOverrides.length) {
          const [reference] = await transaction
            .select({ id: productAttributeValues.id })
            .from(productAttributeValues)
            .where(
              inArray(
                productAttributeValues.attributeId,
                newOverrides.map((attribute) => attribute.id),
              ),
            )
            .limit(1);
          if (reference) {
            throw new Error(
              `El atributo heredado ${newOverrides[0]!.key} está referenciado y no puede sobrescribirse.`,
            );
          }
        }
      }

      for (const existing of existingAttributes) {
        if (!referencedIds.has(existing.id)) continue;
        const next = nextByKey.get(existing.key);
        const incompatible =
          !next ||
          next.type !== existing.type ||
          next.unit !== existing.unit ||
          JSON.stringify(next.options) !== JSON.stringify(existing.options);
        if (incompatible) {
          throw new Error(
            `El atributo ${existing.key} está referenciado y no puede eliminarse ni cambiar de tipo.`,
          );
        }
      }

      const [category] = await transaction
        .update(categories)
        .set({ name: input.name, slug: input.slug, parentId: input.parentId })
        .where(eq(categories.id, id))
        .returning({ id: categories.id, slug: categories.slug });
      if (!category) throw new Error("Category not found");

      const existingByKey = new Map(
        existingAttributes.map((attribute) => [attribute.key, attribute]),
      );
      for (const attribute of input.attributes) {
        const existing = existingByKey.get(attribute.key);
        if (existing) {
          await transaction
            .update(categoryAttributes)
            .set(attribute)
            .where(eq(categoryAttributes.id, existing.id));
        } else {
          await transaction.insert(categoryAttributes).values({
            categoryId: id,
            ...attribute,
          });
        }
      }
      const removedIds = existingAttributes
        .filter((attribute) => !nextByKey.has(attribute.key))
        .map((attribute) => attribute.id);
      if (removedIds.length) {
        await transaction
          .delete(categoryAttributes)
          .where(inArray(categoryAttributes.id, removedIds));
      }

      return category;
    });
  }

  async getCategoryWithAttributes(id: string) {
    const categoryRows = await this.database
      .select({ id: categories.id, parentId: categories.parentId })
      .from(categories);
    const category = categoryRows.find((row) => row.id === id);

    if (!category) {
      return null;
    }

    const attributeRows = await this.database
      .select({
        id: categoryAttributes.id,
        categoryId: categoryAttributes.categoryId,
        key: categoryAttributes.key,
        label: categoryAttributes.label,
        type: categoryAttributes.type,
        required: categoryAttributes.required,
        filterable: categoryAttributes.filterable,
        comparable: categoryAttributes.comparable,
        options: categoryAttributes.options,
        unit: categoryAttributes.unit,
      })
      .from(categoryAttributes)
      .orderBy(categoryAttributes.key);

    return {
      id: category.id,
      attributes: resolveCategoryAttributes(id, categoryRows, attributeRows),
    };
  }

  async listCategories(): Promise<AdminCategorySummary[]> {
    const categoryRows = await this.database
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        parentId: categories.parentId,
      })
      .from(categories)
      .orderBy(categories.name);
    const attributeRows = await this.database
      .select({
        id: categoryAttributes.id,
        categoryId: categoryAttributes.categoryId,
        key: categoryAttributes.key,
        label: categoryAttributes.label,
        type: categoryAttributes.type,
        required: categoryAttributes.required,
        filterable: categoryAttributes.filterable,
        comparable: categoryAttributes.comparable,
        options: categoryAttributes.options,
        unit: categoryAttributes.unit,
      })
      .from(categoryAttributes)
      .orderBy(categoryAttributes.key);
    const maps = buildCategoryMaps(categoryRows, attributeRows);

    return categoryRows.map((category) => ({
      ...category,
      attributes: resolveFromMaps(
        category.id,
        maps.categoriesById,
        maps.attributesByCategory,
      ),
      ownAttributes: maps.attributesByCategory.get(category.id) ?? [],
    }));
  }

  async listAdminProducts(input: {
    query?: string;
    categoryId?: string;
    status?: "published" | "draft";
  }): Promise<AdminProductSummary[]> {
    const conditions = [];
    if (input.query) {
      conditions.push(
        or(
          ilike(products.title, `%${input.query}%`),
          ilike(products.summary, `%${input.query}%`),
        )!,
      );
    }
    if (input.categoryId) {
      conditions.push(eq(products.categoryId, input.categoryId));
    }
    if (input.status) {
      conditions.push(eq(products.published, input.status === "published"));
    }

    return this.database
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        categoryId: products.categoryId,
        categoryName: categories.name,
        purchaseMode: products.purchaseMode,
        priceMinor: products.priceMinor,
        published: products.published,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(products.updatedAt));
  }

  async getAdminProductById(id: string): Promise<AdminProductDetail | null> {
    const [product] = await this.database
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        categoryId: products.categoryId,
        categoryName: categories.name,
        purchaseMode: products.purchaseMode,
        priceMinor: products.priceMinor,
        published: products.published,
        updatedAt: products.updatedAt,
        summary: products.summary,
        description: products.description,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.id, id))
      .limit(1);
    if (!product) return null;

    const values = await this.database
      .select({
        key: categoryAttributes.key,
        value: productAttributeValues.value,
      })
      .from(productAttributeValues)
      .innerJoin(
        categoryAttributes,
        eq(productAttributeValues.attributeId, categoryAttributes.id),
      )
      .where(eq(productAttributeValues.productId, id));

    return {
      ...product,
      attributes: Object.fromEntries(values.map(({ key, value }) => [key, value])),
      optionGroups: await loadOptionGroups(this.database, id),
      images: await loadProductImages(this.database, id),
    };
  }

  async createProduct(input: {
    product: CreateProductInput;
    attributes: Record<string, ProductAttributeValue>;
  }) {
    return this.database.transaction(async (transaction) => {
      const { optionGroups, ...productValues } = input.product;
      const [product] = await transaction
        .insert(products)
        .values(productValues)
        .returning({ id: products.id, slug: products.slug });

      if (!product) {
        throw new Error("Failed to create product");
      }

      const attributeEntries = Object.entries(input.attributes);
      if (attributeEntries.length > 0) {
        const categoryRows = await transaction
          .select({ id: categories.id, parentId: categories.parentId })
          .from(categories);
        const attributeRows = await transaction
          .select({
            id: categoryAttributes.id,
            categoryId: categoryAttributes.categoryId,
            key: categoryAttributes.key,
            label: categoryAttributes.label,
            type: categoryAttributes.type,
            required: categoryAttributes.required,
            filterable: categoryAttributes.filterable,
            comparable: categoryAttributes.comparable,
            options: categoryAttributes.options,
            unit: categoryAttributes.unit,
          })
          .from(categoryAttributes)
          .orderBy(categoryAttributes.key);
        const attributesByKey = new Map(
          resolveCategoryAttributes(
            input.product.categoryId,
            categoryRows,
            attributeRows,
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

      await replaceProductOptionGroups(transaction, product.id, optionGroups);
      return product;
    });
  }

  async updateProduct(
    id: string,
    input: {
      product: CreateProductInput;
      attributes: Record<string, ProductAttributeValue>;
    },
  ) {
    return this.database.transaction(async (transaction) => {
      const { optionGroups, ...productValues } = input.product;
      const [product] = await transaction
        .update(products)
        .set({ ...productValues, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning({ id: products.id, slug: products.slug });
      if (!product) throw new Error("Product not found");

      await transaction
        .delete(productAttributeValues)
        .where(eq(productAttributeValues.productId, id));

      const attributeEntries = Object.entries(input.attributes);
      if (attributeEntries.length) {
        const categoryRows = await transaction
          .select({ id: categories.id, parentId: categories.parentId })
          .from(categories);
        const attributeRows = await transaction
          .select({
            id: categoryAttributes.id,
            categoryId: categoryAttributes.categoryId,
            key: categoryAttributes.key,
            label: categoryAttributes.label,
            type: categoryAttributes.type,
            required: categoryAttributes.required,
            filterable: categoryAttributes.filterable,
            comparable: categoryAttributes.comparable,
            options: categoryAttributes.options,
            unit: categoryAttributes.unit,
          })
          .from(categoryAttributes)
          .orderBy(categoryAttributes.key);
        const attributesByKey = new Map(
          resolveCategoryAttributes(
            input.product.categoryId,
            categoryRows,
            attributeRows,
          ).map((attribute) => [attribute.key, attribute.id]),
        );
        await transaction.insert(productAttributeValues).values(
          attributeEntries.map(([key, value]) => {
            const attributeId = attributesByKey.get(key);
            if (!attributeId) {
              throw new Error(`Attribute ${key} does not belong to the category`);
            }
            return { productId: id, attributeId, value };
          }),
        );
      }

      await replaceProductOptionGroups(transaction, id, optionGroups);
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
          foldedIlike(products.title, input.query),
          foldedIlike(products.summary, input.query),
        )!,
      );
    }
    if (input.categorySlug) {
      conditions.push(eq(categories.slug, input.categorySlug));
    }

    const rows = await this.database
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

    const productIds = rows.map((row) => row.id);
    const [imagesByProduct, productIdsWithOptions] = await Promise.all([
      loadImagesByProductIds(this.database, productIds),
      loadProductIdsWithOptions(this.database, productIds),
    ]);

    return rows.map((row) => ({
      ...row,
      hasOptions: productIdsWithOptions.has(row.id),
      images: imagesByProduct.get(row.id) ?? [],
    }));
  }

  getPublishedProductBySlug(slug: string): Promise<PublishedProductDetail | null> {
    return loadPublishedProductDetail(
      this.database,
      and(eq(products.slug, slug), eq(products.published, true)),
    );
  }

  getPublishedProductById(id: string): Promise<PublishedProductDetail | null> {
    return loadPublishedProductDetail(
      this.database,
      and(eq(products.id, id), eq(products.published, true)),
    );
  }

  async setProductImages(productId: string, urls: string[]) {
    await this.database.transaction(async (transaction) => {
      await transaction
        .delete(productImages)
        .where(eq(productImages.productId, productId));

      if (urls.length === 0) {
        return;
      }

      await transaction.insert(productImages).values(
        urls.map((url, sortOrder) => ({
          productId,
          url,
          sortOrder,
        })),
      );
    });
  }
}
