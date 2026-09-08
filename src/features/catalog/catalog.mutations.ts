"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  createCatalogActions,
  type CatalogActionResult,
} from "./catalog.actions";
import { requireCatalogMutationAccess } from "./catalog.authorization";
import { DrizzleCatalogRepository } from "./catalog.repository";
import { createCatalogService } from "./catalog.service";

function productionActions() {
  return createCatalogActions({
    authorize: () => requireCatalogMutationAccess(),
    catalog: createCatalogService(new DrizzleCatalogRepository(db)),
  });
}

export async function createCategoryAction(
  formData: FormData,
): Promise<CatalogActionResult> {
  const result = await productionActions().createCategoryAction(formData);
  if (result.ok) revalidatePath("/backoffice/categorias");
  return result;
}

export async function createProductAction(
  formData: FormData,
): Promise<CatalogActionResult> {
  const result = await productionActions().createProductAction(formData);
  if (result.ok) revalidatePath("/backoffice/catalogo");
  return result;
}

export async function updateCategoryAction(
  id: string,
  formData: FormData,
): Promise<CatalogActionResult> {
  const result = await productionActions().updateCategoryAction(id, formData);
  if (result.ok) revalidatePath("/backoffice/categorias");
  return result;
}

export async function updateProductAction(
  id: string,
  formData: FormData,
): Promise<CatalogActionResult> {
  const result = await productionActions().updateProductAction(id, formData);
  if (result.ok) revalidatePath("/backoffice/catalogo");
  return result;
}
