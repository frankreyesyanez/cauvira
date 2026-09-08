import Link from "next/link";
import type {
  AdminCategorySummary,
  PublishedProductSummary,
} from "@/features/catalog/catalog.repository";
import { ProductCard } from "@/components/catalog/product-card";
import { StoreChrome } from "@/components/catalog/store-chrome";

type HomeViewProps = {
  products: PublishedProductSummary[];
  categories: AdminCategorySummary[];
  bagCount?: number;
};

export function HomeView({ products, categories, bagCount }: HomeViewProps) {
  const featuredProduct = products[0];

  return (
    <main className="store-home">
      <StoreChrome bagCount={bagCount} categories={categories} />
      <section
        aria-labelledby="home-title"
        className="store-first-viewport"
        data-testid="store-first-viewport"
      >
        <div className="store-hero store-hero--compact">
          <div className="store-hero__copy">
            <p className="store-hero__eyebrow">Catálogo industrial · México</p>
            <h1 id="home-title">Equipa lo que sigue.</h1>
            <p className="store-hero__lead">
              Busca maquinaria, insumos y soluciones listas para operar con
              modalidades claras de compra, cotización o contacto asistido.
            </p>
          </div>
        </div>
        <div className="store-first-viewport__commerce">
          <aside className="store-feature">
            <p className="store-feature__eyebrow">Selección destacada</p>
            {featuredProduct ? (
              <>
                <h2>{featuredProduct.title}</h2>
                <p>{featuredProduct.summary}</p>
                <Link
                  className="button button--secondary"
                  href={`/productos/${featuredProduct.slug}`}
                >
                  Ver solución
                </Link>
              </>
            ) : (
              <>
                <h2>Catálogo en preparación</h2>
                <p>
                  Aún no hay productos publicados en el catálogo. Solicita una
                  solución y la buscaremos por ti.
                </p>
                <Link className="button button--secondary" href="/productos">
                  Explorar catálogo
                </Link>
              </>
            )}
          </aside>
          {products.length > 0 ? (
            <div className="store-product-grid store-product-grid--viewport">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="store-empty store-empty--viewport">
              <span aria-hidden="true" className="store-empty__mark">
                ○
              </span>
              <div>
                <h3>Sin productos publicados</h3>
                <p>
                  Aún no hay productos publicados en el catálogo. Solicita una
                  solución y la buscaremos por ti.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
      {products.length > 0 ? (
        <section className="store-merchandising store-merchandising--link-only">
          <Link className="store-merchandising__link" href="/productos">
            Ver catálogo completo
          </Link>
        </section>
      ) : null}
    </main>
  );
}
