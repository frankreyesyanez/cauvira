import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { forbidden } from "next/navigation";
import { z } from "zod";
import type { CategoryAttributeRecord } from "./catalog.repository";
import {
  createCategorySchema,
  createProductSchema,
  type CreateCategoryInput,
} from "./catalog.validation";

export const catalogMutationRoles = ["administrator", "catalog_manager"] as const;

export type CatalogActionResult =
  | { ok: true; id: string }
  | { ok: false; fieldErrors: Record<string, string[]> };

type CatalogActionService = {
  createCategory(input: unknown): Promise<{ id: string }>;
  createProduct(input: {
    product: unknown;
    attributes: Record<string, unknown>;
  }): Promise<{ id: string }>;
  getCategoryWithAttributes(
    id: string,
  ): Promise<{ id: string; attributes: CategoryAttributeRecord[] } | null>;
};

type CatalogActionDependencies = {
  authorize(roles: typeof catalogMutationRoles): Promise<unknown>;
  catalog: CatalogActionService;
};

const messageByField: Record<string, string> = {
  name: "Escribe un nombre de al menos 2 caracteres.",
  slug: "Usa solo minúsculas, números y guiones.",
  categoryId: "Selecciona una categoría.",
  title: "Escribe un nombre de al menos 3 caracteres.",
  summary: "Escribe un resumen de al menos 10 caracteres.",
  priceMinor: "Ingresa un precio válido mayor a cero.",
};

function zodFieldErrors(error: z.ZodError) {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".") || "_form";
    errors[field] ??= [];
    errors[field].push(messageByField[field] ?? issue.message);
  }
  return errors;
}

function categoryInputFromFormData(formData: FormData): CreateCategoryInput | unknown {
  const indexes = new Set<number>();
  for (const key of formData.keys()) {
    const match = /^attributes\.(\d+)\./.exec(key);
    if (match) indexes.add(Number(match[1]));
  }

  const attributes = [...indexes].sort((a, b) => a - b).map((index) => {
    const prefix = `attributes.${index}`;
    const unit = String(formData.get(`${prefix}.unit`) ?? "").trim();
    const options = String(formData.get(`${prefix}.options`) ?? "")
      .split(",")
      .map((option) => option.trim())
      .filter(Boolean);

    return {
      key: formData.get(`${prefix}.key`),
      label: formData.get(`${prefix}.label`),
      type: formData.get(`${prefix}.type`),
      required: formData.has(`${prefix}.required`),
      filterable: formData.has(`${prefix}.filterable`),
      comparable: formData.has(`${prefix}.comparable`),
      unit: unit || null,
      options,
    };
  });

  const parentId = String(formData.get("parentId") ?? "").trim();
  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    parentId: parentId || null,
    attributes,
  };
}

function parsePriceMinor(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  const pesos = Number(normalized);
  return Number.isFinite(pesos) ? Math.round(pesos * 100) : Number.NaN;
}

function dynamicAttributesFromFormData(
  formData: FormData,
  definitions: CategoryAttributeRecord[],
) {
  const values: Record<string, unknown> = {};
  const fieldErrors: Record<string, string[]> = {};

  for (const definition of definitions) {
    const field = `attribute.${definition.key}`;
    const entries = formData
      .getAll(field)
      .map(String)
      .map((value) => value.trim())
      .filter(Boolean);

    if (definition.type === "boolean") {
      if (entries.length > 0 && ["true", "false"].includes(entries[0]!)) {
        values[definition.key] = entries[0] === "true";
      } else if (entries.length > 0) {
        fieldErrors[field] = ["Selecciona Sí o No."];
      }
    } else if (entries.length > 0) {
      const raw = entries[0]!;
      if (definition.type === "number") {
        const value = Number(raw);
        if (Number.isFinite(value)) values[definition.key] = value;
        else fieldErrors[field] = ["Ingresa un número válido."];
      } else if (definition.type === "multiselect") {
        if (entries.every((entry) => definition.options.includes(entry))) {
          values[definition.key] = entries;
        } else {
          fieldErrors[field] = ["Selecciona únicamente opciones disponibles."];
        }
      } else if (definition.type === "measurement") {
        const value = Number(raw);
        if (Number.isFinite(value)) {
          values[definition.key] = {
            value,
            unit: definition.unit ?? "",
          };
        } else {
          fieldErrors[field] = ["Ingresa una medición válida."];
        }
      } else if (
        definition.type === "select" &&
        !definition.options.includes(raw)
      ) {
        fieldErrors[field] = ["Selecciona una opción disponible."];
      } else if (
        definition.type === "date" &&
        !z.iso.date().safeParse(raw).success
      ) {
        fieldErrors[field] = ["Ingresa una fecha válida."];
      } else {
        values[definition.key] = raw;
      }
    }

    if (definition.required && !(definition.key in values)) {
      fieldErrors[field] ??= ["Este campo es obligatorio."];
    }
  }

  return { values, fieldErrors };
}

export function createCatalogActions(dependencies: CatalogActionDependencies) {
  return {
    async createCategoryAction(formData: FormData): Promise<CatalogActionResult> {
      await dependencies.authorize(catalogMutationRoles);
      const parsed = createCategorySchema.safeParse(
        categoryInputFromFormData(formData),
      );

      if (!parsed.success) {
        return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
      }

      try {
        const result = await dependencies.catalog.createCategory(parsed.data);
        return { ok: true, id: result.id };
      } catch {
        return {
          ok: false,
          fieldErrors: {
            _form: ["No fue posible guardar la categoría. Revisa que el slug sea único."],
          },
        };
      }
    },

    async createProductAction(formData: FormData): Promise<CatalogActionResult> {
      await dependencies.authorize(catalogMutationRoles);
      const product = {
        title: formData.get("title"),
        slug: formData.get("slug"),
        categoryId: formData.get("categoryId"),
        purchaseMode: formData.get("purchaseMode"),
        priceMinor: parsePriceMinor(formData.get("price")),
        summary: formData.get("summary"),
        description: formData.get("description") ?? "",
        published: formData.has("published"),
      };
      const parsed = createProductSchema.safeParse(product);

      if (!parsed.success) {
        return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
      }

      const category = await dependencies.catalog.getCategoryWithAttributes(
        parsed.data.categoryId,
      );
      if (!category) {
        return {
          ok: false,
          fieldErrors: { categoryId: ["La categoría seleccionada ya no existe."] },
        };
      }

      const dynamic = dynamicAttributesFromFormData(formData, category.attributes);
      if (Object.keys(dynamic.fieldErrors).length > 0) {
        return { ok: false, fieldErrors: dynamic.fieldErrors };
      }

      try {
        const result = await dependencies.catalog.createProduct({
          product: parsed.data,
          attributes: dynamic.values,
        });
        return { ok: true, id: result.id };
      } catch (error) {
        return {
          ok: false,
          fieldErrors: {
            _form: [
              error instanceof Error && /attribute/i.test(error.message)
                ? "Revisa los atributos técnicos del producto."
                : "No fue posible guardar el producto. Revisa que el slug sea único.",
            ],
          },
        };
      }
    },
  };
}

async function productionDependencies(): Promise<CatalogActionDependencies> {
  const [{ requireRole }, { db }, { DrizzleCatalogRepository }, { createCatalogService }] =
    await Promise.all([
      import("@/features/auth/require-role"),
      import("@/db"),
      import("./catalog.repository"),
      import("./catalog.service"),
    ]);
  const catalog = createCatalogService(new DrizzleCatalogRepository(db));

  return {
    authorize: (roles) => headers().then((requestHeaders) => requireRole(requestHeaders, roles)),
    catalog,
  };
}

export async function createCategoryAction(
  formData: FormData,
): Promise<CatalogActionResult> {
  "use server";
  try {
    const actions = createCatalogActions(await productionDependencies());
    const result = await actions.createCategoryAction(formData);
    if (result.ok) revalidatePath("/backoffice/categorias");
    return result;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      error.status === 403
    ) {
      forbidden();
    }
    throw error;
  }
}

export async function createProductAction(
  formData: FormData,
): Promise<CatalogActionResult> {
  "use server";
  try {
    const actions = createCatalogActions(await productionDependencies());
    const result = await actions.createProductAction(formData);
    if (result.ok) revalidatePath("/backoffice/catalogo");
    return result;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      error.status === 403
    ) {
      forbidden();
    }
    throw error;
  }
}
