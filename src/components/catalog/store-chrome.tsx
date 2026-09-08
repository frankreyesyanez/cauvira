import Link from "next/link";
import type { AdminCategorySummary } from "@/features/catalog/catalog.repository";
import { SearchForm } from "@/components/catalog/search-form";

type StoreChromeProps = {
  categories: AdminCategorySummary[];
  defaultQuery?: string;
  showSearch?: boolean;
  bagCount?: number;
};

function bagAriaLabel(bagCount: number) {
  return `Bolsa, ${bagCount} ${bagCount === 1 ? "artículo" : "artículos"}`;
}

export function StoreChrome({
  categories,
  defaultQuery,
  showSearch = true,
  bagCount,
}: StoreChromeProps) {
  return (
    <>
      <div className="store-utility">
        <p>Envíos a todo México · Soporte comercial en horario laboral</p>
        <p>Comercio industrial verificado por Cauvira</p>
      </div>
      <header className="store-header">
        <Link className="store-header__brand" href="/">
          <span>Cauvira</span>
          <small>Equipa lo que sigue</small>
        </Link>
        {showSearch ? (
          <SearchForm className="store-header__search" defaultQuery={defaultQuery} />
        ) : null}
        <nav className="store-header__actions" aria-label="Cuenta y pedido">
          <Link className="store-header__action" href="/cuenta">
            Cuenta
          </Link>
          <Link
            className="store-header__action"
            href="/bolsa"
            aria-label={bagCount === undefined ? "Bolsa" : bagAriaLabel(bagCount)}
          >
            <span data-testid="bag-count">
              {bagCount === undefined ? "Bolsa" : `Bolsa (${bagCount})`}
            </span>
          </Link>
        </nav>
      </header>
      <nav className="store-categories" aria-label="Categorías">
        <Link className="store-categories__link" href="/productos">
          Todo el catálogo
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            className="store-categories__link"
            href={`/productos?categoria=${category.slug}`}
          >
            {category.name}
          </Link>
        ))}
      </nav>
    </>
  );
}
