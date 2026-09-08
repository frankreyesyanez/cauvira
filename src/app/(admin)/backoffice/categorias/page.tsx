import { CategoryForm } from "@/components/catalog/category-form";
import { createCategoryAction } from "@/features/catalog/catalog.actions";
import { requireCatalogMutationAccess } from "@/features/catalog/catalog.authorization";
import { createCatalogService } from "@/features/catalog/catalog.service";
import { DrizzleCatalogRepository } from "@/features/catalog/catalog.repository";
import { db } from "@/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  await requireCatalogMutationAccess();
  const catalog = createCatalogService(new DrizzleCatalogRepository(db));
  const categories = await catalog.listCategories();

  return (
    <main className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="ui-eyebrow">Catálogo / estructura</p>
          <h1>Categorías y atributos</h1>
        </div>
        <p>
          Define familias de producto y fichas técnicas reutilizables. Cada
          atributo creado aquí aparece en la captura de productos.
        </p>
      </header>

      <section className="admin-panel" aria-labelledby="new-category-title">
        <div className="admin-panel__heading">
          <span>01</span>
          <div>
            <h2 id="new-category-title">Nueva categoría</h2>
            <p>Configura la estructura sin cambios de código.</p>
          </div>
        </div>
        <CategoryForm
          action={createCategoryAction}
          categories={categories.map(({ id, name }) => ({ id, name }))}
        />
      </section>

      <section className="admin-panel" aria-labelledby="category-list-title">
        <div className="admin-panel__heading">
          <span>02</span>
          <div>
            <h2 id="category-list-title">Estructura actual</h2>
            <p>{categories.length} categorías disponibles.</p>
          </div>
        </div>
        {categories.length === 0 ? (
          <div className="ui-empty">
            <span aria-hidden="true" className="ui-empty__mark">+</span>
            <div>
              <h3>Aún no hay categorías</h3>
              <p>Crea la primera para habilitar la captura de productos.</p>
            </div>
          </div>
        ) : (
          <div className="category-list">
            {categories.map((category) => (
              <article className="category-list__item" key={category.id}>
                <div>
                  <h3>{category.name}</h3>
                  <code>/{category.slug}</code>
                  <div>
                    <Link
                      className="text-action"
                      href={`/backoffice/categorias/${category.id}/editar`}
                    >
                      Editar
                    </Link>
                  </div>
                </div>
                <div className="category-list__attributes">
                  {category.attributes.length ? (
                    category.attributes.map((attribute) => (
                      <span key={attribute.id}>
                        {attribute.label}
                        {attribute.unit ? ` · ${attribute.unit}` : ""}
                        {attribute.required ? " *" : ""}
                      </span>
                    ))
                  ) : (
                    <span>Sin atributos técnicos</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
