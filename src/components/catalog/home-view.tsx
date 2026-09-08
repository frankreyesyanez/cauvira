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
};

export function HomeView({ products, categories }: HomeViewProps) {
  const featuredProduct = products[0];

  return (
    <main className="store-home">
      <StoreChrome categories={categories} />
      <section className="store-hero" aria-labelledby="home-title">
        <div className="store-hero__copy">
          <p className="store-hero__eyebrow">Catálogo industrial · México</p>
          <h1 id="home-title">Equipa lo que sigue.</h1>
          <p className="store-hero__lead">
            Busca maquinaria, insumos y soluciones listas para operar con
            modalidades claras de compra, cotización o contacto asistido.
          </p>
        </div>
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
      </section>
      <section className="store-merchandising" aria-labelledby="home-products">
        <div className="store-merchandising__heading">
          <h2 id="home-products">Soluciones publicadas</h2>
          <Link className="store-merchandising__link" href="/productos">
            Ver catálogo completo
          </Link>
        </div>
        {products.length > 0 ? (
          <div className="store-product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="store-empty">
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
      </section>
    </main>
  );
}
