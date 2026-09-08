import { boolean, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import type { AttributeType } from "@/features/catalog/catalog.contracts";

export const purchaseModeEnum = pgEnum("purchase_mode", [
  "direct_purchase", "quotation", "starting_price", "assisted_contact",
]);

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  parentId: uuid("parent_id").references((): AnyPgColumn => categories.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("categories_slug_unique").on(table.slug)]);

export const categoryAttributes = pgTable("category_attributes", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "cascade" }).notNull(),
  key: text("key").notNull(),
  label: text("label").notNull(),
  type: text("type").$type<AttributeType>().notNull(),
  required: boolean("required").default(false).notNull(),
  filterable: boolean("filterable").default(false).notNull(),
  comparable: boolean("comparable").default(false).notNull(),
  unit: text("unit"),
  options: jsonb("options").$type<string[]>().default([]).notNull(),
}, (table) => [uniqueIndex("category_attribute_key_unique").on(table.categoryId, table.key)]);

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoryId: uuid("category_id").references(() => categories.id).notNull(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  summary: text("summary").notNull(),
  description: text("description").default("").notNull(),
  purchaseMode: purchaseModeEnum("purchase_mode").notNull(),
  priceMinor: integer("price_minor"),
  published: boolean("published").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("products_slug_unique").on(table.slug)]);

export const productAttributeValues = pgTable("product_attribute_values", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  attributeId: uuid("attribute_id").references(() => categoryAttributes.id, { onDelete: "cascade" }).notNull(),
  value: jsonb("value").$type<string | number | boolean | string[] | { value: number; unit: string }>().notNull(),
}, (table) => [uniqueIndex("product_attribute_value_unique").on(table.productId, table.attributeId)]);
