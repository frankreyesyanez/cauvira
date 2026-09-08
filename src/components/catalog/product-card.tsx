import Link from "next/link";
import { AddToCartButton } from "@/components/catalog/add-to-cart-button";
import { ProductMedia } from "@/components/catalog/product-media";
import type { PublishedProductSummary } from "@/features/catalog/catalog.repository";
import { catalogImageSrc } from "@/lib/catalog-image";
import { formatMxn } from "@/lib/money";

export function ProductCard({ product }: { product: PublishedProductSummary }) {
  const hasPhoto = Boolean(catalogImageSrc(product.images, product.slug));

  return (
    <article className="product-card">
      <Link
        className={
          hasPhoto
            ? "product-card__visual product-card__visual--photo"
            : "product-card__visual"
        }
        href={`/productos/${product.slug}`}
        aria-label={`Ver ${product.title}`}
      >
        <ProductMedia
          images={product.images}
          slug={product.slug}
          title={product.title}
        />
      </Link>
      <div className="product-card__body">
        <p className="product-card__eyebrow">Solución verificada</p>
        <h3>
          <Link href={`/productos/${product.slug}`}>{product.title}</Link>
        </h3>
        <p className="product-card__summary">{product.summary}</p>
        <div className="product-card__commercial">
          <p>Desde {formatMxn(product.priceMinor)}</p>
        </div>
        {product.hasOptions ? (
          <Link
            className="button button--primary product-card__action"
            href={`/productos/${product.slug}`}
          >
            Agregar al carrito
          </Link>
        ) : (
          <div className="product-card__action">
            <AddToCartButton productId={product.id} />
          </div>
        )}
      </div>
    </article>
  );
}
