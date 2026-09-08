import { z } from "zod";
import { catalogMutationRoles } from "./catalog.authorization";
import type { CategoryAttributeRecord } from "./catalog.repository";
import {
  createCategorySchema,
  createProductSchema,
  type CreateCategoryInput,
} from "./catalog.validation";

export { catalogMutationRoles } from "./catalog.authorization";

export type CatalogActionResult =
  | { ok: true; id: string }
  | { ok: false; fieldErrors: Record<string, string[]> };

type CatalogActionService = {
  createCategory(input: unknown): Promise<{ id: string }>;
  updateCategory(id: string, input: unknown): Promise<{ id: string }>;
  createProduct(input: {
    product: unknown;
    attributes: Record<string, unknown>;
  }): Promise<{ id: string }>;
  updateProduct(id: string, input: {
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
  description: "La descripción excede la longitud permitida.",
  purchaseMode: "Selecciona una modalidad de compra válida.",
  priceMinor: "Ingresa un precio válido mayor a cero.",
  optionGroups: "Revisa los grupos de opciones del producto.",
};

function messageForIssue(issue: z.ZodIssue) {
  const field = issue.path.join(".") || "_form";
  if (messageByField[field]) return messageByField[field];

  const leaf = String(issue.path.at(-1) ?? "");
  if (issue.path[0] === "optionGroups") {
    if (leaf === "name") return "Escribe el nombre del grupo de opciones.";
    if (leaf === "label") return "Escribe el nombre de la opción.";
    if (leaf === "values") return "Agrega al menos un valor al grupo.";
    if (leaf === "priceDeltaMinor") return "Ingresa un cargo válido de cero o mayor.";
    if (leaf === "sortOrder") return "Ingresa un orden válido.";
    return messageByField.optionGroups ?? issue.message;
  }

  return issue.message;
}

function zodFieldErrors(error: z.ZodError) {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".") || "_form";
    errors[field] ??= [];
    errors[field].push(messageForIssue(issue));
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

function parseSortOrder(value: FormDataEntryValue | null, fallback: number) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function optionGroupsFromFormData(formData: FormData) {
  const groupIndexes = new Set<number>();
  for (const key of formData.keys()) {
    const match = /^optionGroups\.(\d+)\./.exec(key);
    if (match) groupIndexes.add(Number(match[1]));
  }

  return [...groupIndexes].sort((a, b) => a - b).map((groupIndex) => {
    const prefix = `optionGroups.${groupIndex}`;
    const valueIndexes = new Set<number>();
    for (const key of formData.keys()) {
      const match = new RegExp(`^${prefix.replaceAll(".", "\\.")}\\.values\\.(\\d+)\\.`).exec(
        key,
      );
      if (match) valueIndexes.add(Number(match[1]));
    }

    return {
      name: formData.get(`${prefix}.name`),
      required: formData.has(`${prefix}.required`),
      sortOrder: parseSortOrder(formData.get(`${prefix}.sortOrder`), groupIndex),
      values: [...valueIndexes].sort((a, b) => a - b).map((valueIndex) => {
        const valuePrefix = `${prefix}.values.${valueIndex}`;
        return {
          label: formData.get(`${valuePrefix}.label`),
          priceDeltaMinor: parsePriceMinor(formData.get(`${valuePrefix}.price`)),
          sortOrder: parseSortOrder(
            formData.get(`${valuePrefix}.sortOrder`),
            valueIndex,
          ),
        };
      }),
    };
  });
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
  async function saveCategory(
    formData: FormData,
    persist: (input: CreateCategoryInput) => Promise<{ id: string }>,
  ): Promise<CatalogActionResult> {
    const parsed = createCategorySchema.safeParse(
      categoryInputFromFormData(formData),
    );
    if (!parsed.success) {
      return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
    }
    try {
      const result = await persist(parsed.data);
      return { ok: true, id: result.id };
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "field" in error &&
        typeof error.field === "string"
      ) {
        return {
          ok: false,
          fieldErrors: {
            [error.field]: [
              error instanceof Error ? error.message : "El valor no es válido.",
            ],
          },
        };
      }
      return {
        ok: false,
        fieldErrors: {
          _form: ["No fue posible guardar la categoría. Revisa que el slug sea único."],
        },
      };
    }
  }

  async function saveProduct(
    formData: FormData,
    persist: (input: {
      product: unknown;
      attributes: Record<string, unknown>;
    }) => Promise<{ id: string }>,
  ): Promise<CatalogActionResult> {
    const product = {
      title: formData.get("title"),
      slug: formData.get("slug"),
      categoryId: formData.get("categoryId"),
      purchaseMode: formData.get("purchaseMode"),
      priceMinor: parsePriceMinor(formData.get("price")),
      summary: formData.get("summary"),
      description: formData.get("description") ?? "",
      published: formData.has("published"),
      optionGroups: optionGroupsFromFormData(formData),
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
      const result = await persist({
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
  }

  return {
    async createCategoryAction(formData: FormData): Promise<CatalogActionResult> {
      await dependencies.authorize(catalogMutationRoles);
      return saveCategory(formData, (input) =>
        dependencies.catalog.createCategory(input),
      );
    },

    async updateCategoryAction(
      id: string,
      formData: FormData,
    ): Promise<CatalogActionResult> {
      await dependencies.authorize(catalogMutationRoles);
      return saveCategory(formData, (input) =>
        dependencies.catalog.updateCategory(id, input),
      );
    },

    async createProductAction(formData: FormData): Promise<CatalogActionResult> {
      await dependencies.authorize(catalogMutationRoles);
      return saveProduct(formData, (input) =>
        dependencies.catalog.createProduct(input),
      );
    },

    async updateProductAction(
      id: string,
      formData: FormData,
    ): Promise<CatalogActionResult> {
      await dependencies.authorize(catalogMutationRoles);
      return saveProduct(formData, (input) =>
        dependencies.catalog.updateProduct(id, input),
      );
    },
  };
}
