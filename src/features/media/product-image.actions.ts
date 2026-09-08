"use server";

import { asc, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { productImages, products } from "@/db/schema/catalog";
import { requireCatalogMutationAccess } from "@/features/catalog/catalog.authorization";
import { env } from "@/lib/env";
import {
  createProductImageStorage,
  objectKeyFromPublicUrl,
  productImageObjectKey,
} from "./product-image-storage";
import {
  STORAGE_CONFIG_ERROR,
  validateProductImageUpload,
  type ProductImageActionResult,
} from "./product-image.validation";

function storageCredentials() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return {
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

function fail(message: string): ProductImageActionResult {
  return { ok: false, fieldErrors: { images: [message] } };
}

async function listImages(productId: string) {
  return db
    .select({
      id: productImages.id,
      url: productImages.url,
      sortOrder: productImages.sortOrder,
    })
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.sortOrder), asc(productImages.id));
}

async function compactSortOrders(productId: string) {
  return db.transaction(async (tx) => {
    const images = await tx
      .select({
        id: productImages.id,
        url: productImages.url,
        sortOrder: productImages.sortOrder,
      })
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(asc(productImages.sortOrder), asc(productImages.id));

    for (const [index, image] of images.entries()) {
      if (image.sortOrder !== index) {
        await tx
          .update(productImages)
          .set({ sortOrder: index })
          .where(eq(productImages.id, image.id));
      }
    }

    return tx
      .select({
        id: productImages.id,
        url: productImages.url,
        sortOrder: productImages.sortOrder,
      })
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(asc(productImages.sortOrder), asc(productImages.id));
  });
}

function revalidateProduct(productId: string) {
  revalidatePath("/backoffice/catalogo");
  revalidatePath(`/backoffice/catalogo/${productId}/editar`);
}

async function requireExistingProduct(productId: string) {
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  return product ?? null;
}

export async function uploadProductImageAction(
  productId: string,
  formData: FormData,
): Promise<ProductImageActionResult> {
  await requireCatalogMutationAccess();

  const product = await requireExistingProduct(productId);
  if (!product) {
    return fail("El producto ya no existe.");
  }

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return fail("Selecciona una foto JPG, PNG o WebP.");
  }

  const current = await listImages(productId);
  const validated = validateProductImageUpload({
    mime: file.type,
    size: file.size,
    currentCount: current.length,
  });
  if (!validated.success) {
    return { ok: false, fieldErrors: validated.fieldErrors };
  }

  const credentials = storageCredentials();
  if (!credentials) {
    return fail(STORAGE_CONFIG_ERROR);
  }

  const objectKey = productImageObjectKey(productId, file.type);
  const storage = createProductImageStorage(
    credentials.url,
    credentials.serviceRoleKey,
  );

  try {
    const url = await storage.upload(objectKey, file, file.type);
    const [aggregate] = await db
      .select({ highest: max(productImages.sortOrder) })
      .from(productImages)
      .where(eq(productImages.productId, productId));
    const sortOrder = (aggregate?.highest ?? -1) + 1;

    await db.insert(productImages).values({
      productId,
      url,
      sortOrder,
    });
  } catch {
    return fail("No fue posible subir la foto. Inténtalo de nuevo.");
  }

  revalidateProduct(productId);
  return { ok: true, images: await listImages(productId) };
}

export async function reorderProductImageAction(
  productId: string,
  imageId: string,
  direction: "up" | "down",
): Promise<ProductImageActionResult> {
  await requireCatalogMutationAccess();

  const images = await listImages(productId);
  const index = images.findIndex((image) => image.id === imageId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= images.length) {
    return fail("No se puede reordenar esa foto.");
  }

  const current = images[index]!;
  const neighbor = images[swapWith]!;

  await db.transaction(async (tx) => {
    await tx
      .update(productImages)
      .set({ sortOrder: neighbor.sortOrder })
      .where(eq(productImages.id, current.id));
    await tx
      .update(productImages)
      .set({ sortOrder: current.sortOrder })
      .where(eq(productImages.id, neighbor.id));
  });

  revalidateProduct(productId);
  return { ok: true, images: await listImages(productId) };
}

export async function deleteProductImageAction(
  productId: string,
  imageId: string,
): Promise<ProductImageActionResult> {
  await requireCatalogMutationAccess();

  const [image] = await db
    .select({
      id: productImages.id,
      url: productImages.url,
    })
    .from(productImages)
    .where(eq(productImages.id, imageId))
    .limit(1);

  if (!image) {
    return fail("La foto ya no existe.");
  }

  const credentials = storageCredentials();
  const objectKey = objectKeyFromPublicUrl(image.url);
  if (credentials && objectKey) {
    try {
      await createProductImageStorage(
        credentials.url,
        credentials.serviceRoleKey,
      ).remove(objectKey);
    } catch {
      return fail("No fue posible eliminar la foto del almacenamiento.");
    }
  }

  await db.delete(productImages).where(eq(productImages.id, imageId));
  const images = await compactSortOrders(productId);
  revalidateProduct(productId);
  return { ok: true, images };
}
