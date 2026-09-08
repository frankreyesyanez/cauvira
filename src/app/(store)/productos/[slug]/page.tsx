import Link from "next/link";
import { notFound } from "next/navigation";
import { createCatalogService } from "@/features/catalog/catalog.service";
import { DrizzleCatalogRepository } from "@/features/catalog/catalog.repository";
import { formatAttributeValue } from "@/components/catalog/format-attribute-value";
import { getProductAction } from "@/components/catalog/product-detail-action";
import { ProductMedia } from "@/components/catalog/product-media";
import { catalogImageSrc } from "@/lib/catalog-image";
import { StoreChrome } from "@/components/catalog/store-chrome";
import { formatMxn } from "@/lib/money";
import { db } from "@/db";

export const dynamic = "force-dynamic";

type ProductDetailPageProps = {
  params: Promise<{ slug: string }>;
};

function ProductPrice({
  purchaseMode,
  priceMinor,
}: {
  purchaseMode: string;
  priceMinor: number | null;
}) {
  if (purchaseMode === "quotation") {
    return <p className="product-detail__price">Precio por proyecto</p>;
  }

  if (purchaseMode === "assisted_contact") {
    return <p className="product-detail__price">Configuración asistida</p>;
  }

  if (priceMinor === null) {
    return <p className="product-detail__price">Precio a confirmar</p>;
  }

  const price = formatMxn(priceMinor);

  if (purchaseMode === "starting_price") {
    return <p className="product-detail__price">Desde {price}</p>;
  }

  return <p className="product-detail__price">{price}</p>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const catalog = createCatalogService(new DrizzleCatalogRepository(db));
  const [product, categories] = await Promise.all([
    catalog.getPublishedProductBySlug(slug),
    catalog.listCategories(),
  ]);

  if (!product) {
    notFound();
  }

  const action = getProductAction(product.purchaseMode);

  return (
    <main className="product-detail">
      <StoreChrome categories={categories} showSearch={false} />
      <article className="product-detail__layout">
        <div className="product-detail__media">
          <p className="product-detail__media-label">Imagen principal</p>
          <div
            className={
              catalogImageSrc(product.slug)
                ? "product-detail__media-frame product-detail__media-frame--photo"
                : "product-detail__media-frame"
            }
          >
            <ProductMedia slug={product.slug} title={product.title} />
          </div>
        </div>
        <div className="product-detail__content">
          <p className="product-detail__eyebrow">Solución verificada</p>
          <h1>{product.title}</h1>
          <p className="product-detail__summary">{product.summary}</p>
          <ProductPrice
            priceMinor={product.priceMinor}
            purchaseMode={product.purchaseMode}
          />
          <Link
            className="button button--primary product-detail__action"
            href={`#${action.anchor}`}
            id={action.anchor}
          >
            {action.label}
          </Link>
          <section aria-labelledby="product-description">
            <h2 id="product-description">Descripción</h2>
            <p>{product.description}</p>
          </section>
          <section aria-labelledby="product-attributes">
            <h2 id="product-attributes">Especificaciones técnicas</h2>
            {product.attributes.length === 0 ? (
              <p className="product-detail__empty">
                Aún no hay atributos técnicos publicados para este producto.
              </p>
            ) : (
              <dl className="product-detail__attributes">
                {product.attributes.map((attribute) => (
                  <div key={attribute.label}>
                    <dt>{attribute.label}</dt>
                    <dd>
                      {formatAttributeValue(attribute.value, attribute.unit)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
          <section aria-labelledby="product-documents">
            <h2 id="product-documents">Documentos</h2>
            <p className="product-detail__empty">
              No hay documentos disponibles por el momento.
            </p>
          </section>
          <section aria-labelledby="product-warranty">
            <h2 id="product-warranty">Garantía</h2>
            <p className="product-detail__empty">
              La información de garantía se publicará próximamente.
            </p>
          </section>
          <section aria-labelledby="product-lead-time">
            <h2 id="product-lead-time">Tiempo de entrega</h2>
            <p className="product-detail__empty">
              El tiempo de entrega se confirmará al solicitar la solución.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
