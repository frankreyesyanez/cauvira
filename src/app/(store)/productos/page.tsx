import Link from "next/link";
import { createCatalogService } from "@/features/catalog/catalog.service";
import { DrizzleCatalogRepository } from "@/features/catalog/catalog.repository";
import { ProductCard } from "@/components/catalog/product-card";
import { getListingEmptyMessage } from "@/components/catalog/listing-empty-message";
import { StoreChrome } from "@/components/catalog/store-chrome";
import { db } from "@/db";

export const dynamic = "force-dynamic";

type ProductListingPageProps = {
  searchParams: Promise<{
    q?: string;
    categoria?: string;
  }>;
};

export default async function ProductListingPage({
  searchParams,
}: ProductListingPageProps) {
  const filters = await searchParams;
  const query = filters.q?.trim() || undefined;
  const catalog = createCatalogService(new DrizzleCatalogRepository(db));
  const [products, categories] = await Promise.all([
    catalog.listPublishedProducts({
      query,
      categorySlug: filters.categoria || undefined,
    }),
    catalog.listCategories(),
  ]);
  const activeCategory = categories.find(
    (category) => category.slug === filters.categoria,
  );

  return (
    <main className="store-listing">
      <StoreChrome categories={categories} defaultQuery={filters.q} />
      <header className="store-listing__header">
        <div>
          <p className="store-listing__eyebrow">Catálogo / búsqueda</p>
          <h1>
            {query
              ? `Resultados para “${query}”`
              : activeCategory
                ? activeCategory.name
                : "Productos"}
          </h1>
        </div>
        {filters.categoria ? (
          <Link className="button button--ghost" href="/productos">
            Quitar filtro de categoría
          </Link>
        ) : null}
      </header>

      {products.length === 0 ? (
        <div className="store-empty">
          <span aria-hidden="true" className="store-empty__mark">
            ○
          </span>
          <div>
            <h2>Sin resultados</h2>
            <p>{getListingEmptyMessage(query)}</p>
          </div>
          <Link className="button button--primary" href="/">
            Volver al inicio
          </Link>
        </div>
      ) : (
        <div className="store-product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
