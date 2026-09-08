import Link from "next/link";
import { headers } from "next/headers";
import { roles } from "@/db/schema/auth";
import { requireRole } from "@/features/auth/require-role";
import { createCatalogService } from "@/features/catalog/catalog.service";
import { DrizzleCatalogRepository } from "@/features/catalog/catalog.repository";
import { db } from "@/db";

export const dynamic = "force-dynamic";

const modeLabels: Record<string, string> = {
  direct_purchase: "Compra directa",
  quotation: "Cotización",
  starting_price: "Precio desde",
  assisted_contact: "Contacto asistido",
};

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const date = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

type CatalogPageProps = {
  searchParams: Promise<{
    categoria?: string;
    estado?: string;
    q?: string;
  }>;
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const filters = await searchParams;
  const session = await requireRole(await headers(), roles);
  const canManageCatalog =
    session.user.role === "administrator" ||
    session.user.role === "catalog_manager";
  const catalog = createCatalogService(new DrizzleCatalogRepository(db));
  const categories = await catalog.listCategories();
  const status =
    filters.estado === "published" || filters.estado === "draft"
      ? filters.estado
      : undefined;
  const products = await catalog.listAdminProducts({
    query: filters.q?.trim() || undefined,
    categoryId: filters.categoria || undefined,
    status,
  });

  return (
    <main className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="ui-eyebrow">Catálogo / operación</p>
          <h1>Productos</h1>
        </div>
        <div className="admin-page__header-actions">
          <p>
            Consulta modalidad, precio y publicación desde una vista compacta
            para operación diaria.
          </p>
          {canManageCatalog ? (
            <Link className="button button--primary" href="/backoffice/catalogo/nuevo">
              Crear producto
            </Link>
          ) : null}
        </div>
      </header>

      <form className="catalog-filters">
        <div className="field">
          <label className="field__label" htmlFor="q">Buscar</label>
          <input
            className="field__control"
            defaultValue={filters.q}
            id="q"
            name="q"
            placeholder="Nombre o descripción"
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="categoria">Categoría</label>
          <select
            className="field__control"
            defaultValue={filters.categoria}
            id="categoria"
            name="categoria"
          >
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="estado">Publicación</label>
          <select
            className="field__control"
            defaultValue={status}
            id="estado"
            name="estado"
          >
            <option value="">Todos</option>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
          </select>
        </div>
        <button className="button button--secondary" type="submit">
          Aplicar filtros
        </button>
      </form>

      {products.length === 0 ? (
        <div className="ui-empty">
          <span aria-hidden="true" className="ui-empty__mark">+</span>
          <div>
            <h2>Aún no hay productos</h2>
            <p>Aún no hay productos. Crea el primero para comenzar el catálogo.</p>
          </div>
          {canManageCatalog ? (
            <Link className="button button--primary" href="/backoffice/catalogo/nuevo">
              Crear producto
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="catalog-table-wrap">
          <table className="catalog-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Modalidad</th>
                <th>Publicación</th>
                <th>Precio</th>
                <th>Última actualización</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <strong>{product.title}</strong>
                    <small>/{product.slug}</small>
                  </td>
                  <td>{product.categoryName}</td>
                  <td>{modeLabels[product.purchaseMode] ?? product.purchaseMode}</td>
                  <td>
                    <span className={product.published ? "ui-status ui-status--active" : "ui-status"}>
                      <span aria-hidden="true" className="ui-icon">
                        {product.published ? "✓" : "○"}
                      </span>
                      {product.published ? "Publicado" : "Borrador"}
                    </span>
                  </td>
                  <td>
                    {product.priceMinor === null
                      ? "Sin precio"
                      : money.format(product.priceMinor / 100)}
                  </td>
                  <td>{date.format(product.updatedAt)}</td>
                  <td>
                    {canManageCatalog ? (
                      <>
                        <Link className="text-action" href="/backoffice/catalogo/nuevo">
                          Crear relacionado
                        </Link>
                        {" · "}
                        <Link
                          className="text-action"
                          href={`/backoffice/catalogo/${product.id}/editar`}
                        >
                          Editar
                        </Link>
                      </>
                    ) : (
                      <span className="catalog-table__restricted">Solo lectura</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
