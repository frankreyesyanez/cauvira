import { catalogImageSrc } from "@/lib/catalog-image";

type ProductMediaProps = {
  slug: string;
  title: string;
};

export function ProductMedia({ slug, title }: ProductMediaProps) {
  const src = catalogImageSrc(slug);

  if (!src) {
    return (
      <>
        <span>Selección Cauvira</span>
        <strong aria-hidden="true">CV</strong>
      </>
    );
  }

  return <img alt={title} src={src} />;
}
