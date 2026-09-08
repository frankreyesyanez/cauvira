import { z } from "zod";
import { attributeTypes, purchaseModes } from "./catalog.contracts";

const categoryAttributeSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().trim().min(1).max(80),
  type: z.enum(attributeTypes),
  required: z.boolean().default(false),
  filterable: z.boolean().default(false),
  comparable: z.boolean().default(false),
  unit: z.string().trim().max(20).nullable().default(null),
  options: z.array(z.string().trim().min(1)).default([]),
}).superRefine((attribute, context) => {
  if (attribute.type === "measurement" && !attribute.unit) {
    context.addIssue({
      code: "custom",
      path: ["unit"],
      message: "La unidad es obligatoria para una medición.",
    });
  }
  if (
    (attribute.type === "select" || attribute.type === "multiselect") &&
    attribute.options.length === 0
  ) {
    context.addIssue({
      code: "custom",
      path: ["options"],
      message: "Agrega al menos una opción.",
    });
  }
  if (new Set(attribute.options).size !== attribute.options.length) {
    context.addIssue({
      code: "custom",
      path: ["options"],
      message: "Las opciones no pueden repetirse.",
    });
  }
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  parentId: z.uuid().nullable().default(null),
  attributes: z.array(categoryAttributeSchema),
});

export const createProductSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  categoryId: z.uuid(),
  purchaseMode: z.enum(purchaseModes),
  priceMinor: z.int().positive().nullable(),
  summary: z.string().trim().min(10).max(300),
  description: z.string().trim().max(10_000).default(""),
  published: z.boolean().default(false),
}).superRefine((value, context) => {
  if (
    (value.purchaseMode === "direct_purchase" ||
      value.purchaseMode === "starting_price") &&
    value.priceMinor === null
  ) {
    context.addIssue({
      code: "custom",
      path: ["priceMinor"],
      message: "priceMinor is required for priced purchase modes",
    });
  }
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
