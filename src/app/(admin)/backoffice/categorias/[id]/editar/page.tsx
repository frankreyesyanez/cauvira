import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/catalog/category-form";
import { db } from "@/db";
import { updateCategoryAction } from "@/features/catalog/catalog.mutations";
import { requireCatalogMutationAccess } from "@/features/catalog/catalog.authorization";
import { DrizzleCatalogRepository } from "@/features/catalog/catalog.repository";
import { createCatalogService } from "@/features/catalog/catalog.service";

export const dynamic = "force-dynamic";

type EditCategoryPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCategoryPage({
  params,
}: EditCategoryPageProps) {
  await requireCatalogMutationAccess();
  const { id } = await params;
  const catalog = createCatalogService(new DrizzleCatalogRepository(db));
  const categories = await catalog.listCategories();
  const category = categories.find((candidate) => candidate.id === id);
  if (!category) notFound();

  return (
    <main className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="ui-eyebrow">Catálogo / edición</p>
          <h1>Editar categoría</h1>
        </div>
        <div className="admin-page__header-actions">
          <p>
            Actualiza la estructura sin romper las fichas técnicas ya
            capturadas.
          </p>
          <Link className="button button--ghost" href="/backoffice/categorias">
            Volver a categorías
          </Link>
        </div>
      </header>
      <CategoryForm
        action={updateCategoryAction.bind(null, id)}
        categories={categories.map(({ id: optionId, name }) => ({
          id: optionId,
          name,
        }))}
        initialCategory={{
          id: category.id,
          name: category.name,
          slug: category.slug,
          parentId: category.parentId,
          attributes: category.ownAttributes,
        }}
      />
    </main>
  );
}
