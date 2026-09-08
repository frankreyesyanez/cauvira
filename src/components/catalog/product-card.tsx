import Link from "next/link";
import type { PurchaseMode } from "@/features/catalog/catalog.contracts";
import { getProductAction } from "@/components/catalog/product-detail-action";
import { ProductMedia } from "@/components/catalog/product-media";
import { catalogImageSrc } from "@/lib/catalog-image";
import { formatMxn } from "@/lib/money";

type ProductCardProduct = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  purchaseMode: PurchaseMode | string;
  priceMinor: number | null;
};

export function ProductCard({ product }: { product: ProductCardProduct }) {
  const mode = product.purchaseMode as PurchaseMode;
  const action = getProductAction(mode);
  const price =
    product.priceMinor === null ? null : formatMxn(product.priceMinor);

  const hasPhoto = Boolean(catalogImageSrc(product.slug));

  return (
    <article className={`product-card product-card--${mode}`}>
      <Link
        className={
          hasPhoto
            ? "product-card__visual product-card__visual--photo"
            : "product-card__visual"
        }
        href={`/productos/${product.slug}`}
        aria-label={`Ver ${product.title}`}
      >
        <ProductMedia slug={product.slug} title={product.title} />
      </Link>
      <div className="product-card__body">
        <p className="product-card__eyebrow">Solución verificada</p>
        <h3>
          <Link href={`/productos/${product.slug}`}>{product.title}</Link>
        </h3>
        <p className="product-card__summary">{product.summary}</p>
        <div className="product-card__commercial">
          {mode === "quotation" && <p>Precio por proyecto</p>}
          {mode === "assisted_contact" && <p>Configuración asistida</p>}
          {mode === "direct_purchase" && price && <p>{price}</p>}
          {mode === "starting_price" && price && <p>Desde {price}</p>}
        </div>
        <Link
          className="button button--primary product-card__action"
          href={`/productos/${product.slug}#${action.anchor}`}
        >
          {action.label}
        </Link>
      </div>
    </article>
  );
}
