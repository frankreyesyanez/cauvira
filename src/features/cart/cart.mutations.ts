"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { db } from "@/db";
import { DrizzleCatalogRepository } from "@/features/catalog/catalog.repository";
import { createCartActions } from "./cart.actions";
import { DrizzleCartRepository } from "./cart.repository";
import { createCartService } from "./cart.service";

function productionActions() {
  const cartRepo = new DrizzleCartRepository(db);
  return createCartActions({
    cookies,
    cartRepo,
    cart: createCartService(cartRepo, new DrizzleCatalogRepository(db)),
  });
}

function revalidateStorefront() {
  revalidatePath("/");
  revalidatePath("/productos");
  revalidatePath("/productos/[slug]", "page");
  revalidatePath("/bolsa");
}

export async function addToCartAction(formData: FormData) {
  const result = await productionActions().addToCartAction(formData);
  if (result.ok) {
    revalidateStorefront();
  }
  return result;
}

export async function updateCartItemQuantityAction(formData: FormData) {
  await productionActions().updateCartItemQuantityAction(formData);
  revalidateStorefront();
}

export async function removeCartItemAction(formData: FormData) {
  await productionActions().removeCartItemAction(formData);
  revalidateStorefront();
}

export async function getBagItemCount() {
  return productionActions().getBagItemCount();
}

export async function ensureCartId() {
  return productionActions().ensureCartId();
}
