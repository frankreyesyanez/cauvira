import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/catalog/product-form";
import { db } from "@/db";
import { updateProductAction } from "@/features/catalog/catalog.actions";
import { requireCatalogMutationAccess } from "@/features/catalog/catalog.authorization";
import { DrizzleCatalogRepository } from "@/features/catalog/catalog.repository";
import { createCatalogService } from "@/features/catalog/catalog.service";

export const dynamic = "force-dynamic";

type EditProductPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: EditProductPageProps) {
  await requireCatalogMutationAccess();
  const { id } = await params;
  const catalog = createCatalogService(new DrizzleCatalogRepository(db));
  const [categories, product] = await Promise.all([
    catalog.listCategories(),
    catalog.getAdminProductById(id),
  ]);
  if (!product) notFound();

  return (
    <main className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="ui-eyebrow">Catálogo / edición</p>
          <h1>Editar producto</h1>
        </div>
        <div className="admin-page__header-actions">
          <p>
            Actualiza información pública, modalidad y ficha técnica sin
            exponer datos de proveedor.
          </p>
          <Link className="button button--ghost" href="/backoffice/catalogo">
            Volver al catálogo
          </Link>
        </div>
      </header>
      <ProductForm
        action={updateProductAction.bind(null, id)}
        categories={categories}
        initialProduct={product}
      />
    </main>
  );
}
