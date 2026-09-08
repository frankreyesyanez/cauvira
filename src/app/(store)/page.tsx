import { createCatalogService } from "@/features/catalog/catalog.service";
import { DrizzleCatalogRepository } from "@/features/catalog/catalog.repository";
import { getBagItemCount } from "@/features/cart/cart.mutations";
import { HomeView } from "@/components/catalog/home-view";
import { db } from "@/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const catalog = createCatalogService(new DrizzleCatalogRepository(db));
  const [products, categories, bagCount] = await Promise.all([
    catalog.listPublishedProducts({}),
    catalog.listCategories(),
    getBagItemCount(),
  ]);

  return (
    <HomeView bagCount={bagCount} categories={categories} products={products} />
  );
}
