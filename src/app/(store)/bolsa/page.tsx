import { BagView } from "@/components/catalog/bag-view";
import { db } from "@/db";
import { ensureCartId } from "@/features/cart/cart.mutations";
import { DrizzleCartRepository } from "@/features/cart/cart.repository";
import { createCartService } from "@/features/cart/cart.service";
import { DrizzleCatalogRepository } from "@/features/catalog/catalog.repository";
import { createCatalogService } from "@/features/catalog/catalog.service";

export const dynamic = "force-dynamic";

export default async function BagPage() {
  const catalogRepo = new DrizzleCatalogRepository(db);
  const catalog = createCatalogService(catalogRepo);
  const cartService = createCartService(new DrizzleCartRepository(db), catalogRepo);
  const cartId = await ensureCartId();
  const [cart, categories] = await Promise.all([
    cartService.getCart(cartId),
    catalog.listCategories(),
  ]);

  return <BagView bagCount={cart.itemCount} cart={cart} categories={categories} />;
}
