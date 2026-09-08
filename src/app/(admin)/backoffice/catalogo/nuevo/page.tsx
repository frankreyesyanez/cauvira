import Link from "next/link";
import { ProductForm } from "@/components/catalog/product-form";
import {
  catalogMutationRoles,
  createProductAction,
} from "@/features/catalog/catalog.actions";
import { requireRole } from "@/features/auth/require-role";
import { createCatalogService } from "@/features/catalog/catalog.service";
import { DrizzleCatalogRepository } from "@/features/catalog/catalog.repository";
import { db } from "@/db";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requireRole(await headers(), catalogMutationRoles);
  const catalog = createCatalogService(new DrizzleCatalogRepository(db));
  const categories = await catalog.listCategories();

  return (
    <main className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="ui-eyebrow">Catálogo / alta</p>
          <h1>Nuevo producto</h1>
        </div>
        <div className="admin-page__header-actions">
          <p>
            Captura la información pública y la ficha técnica derivada de su
            categoría. Los datos de proveedor no forman parte de esta vista.
          </p>
          <Link className="button button--ghost" href="/backoffice/catalogo">
            Volver al catálogo
          </Link>
        </div>
      </header>
      <ProductForm action={createProductAction} categories={categories} />
    </main>
  );
}
