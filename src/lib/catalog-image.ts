const fallbackCatalogImages = new Set([
  "maquina-de-hielo-industrial-500",
  "maquina-de-hielo-escamas-1000",
  "montacargas-electrico",
  "montacargas-diesel-3t",
  "cafe-especialidad-grano-1kg",
  "capsulas-cafe-compatibles-50",
  "cancha-de-padel-panoramica",
  "cancha-de-padel-indoor",
]);

export const GALLERY_SWIPE_THRESHOLD_PX = 30;

type CatalogImage = { url: string };

export function catalogImageSrc(images: CatalogImage[] = [], slug?: string) {
  return catalogMediaUrls(images, slug)[0] ?? null;
}

export function catalogMediaUrls(images: CatalogImage[] = [], slug?: string) {
  const fromDb = images.map((image) => image.url).filter(Boolean);
  if (fromDb.length > 0) {
    return fromDb;
  }

  return slug && fallbackCatalogImages.has(slug) ? [`/catalog/${slug}.jpg`] : [];
}

export function hoverScrubIndex(offsetX: number, width: number, count: number) {
  if (count <= 0 || width <= 0) {
    return 0;
  }

  return Math.min(count - 1, Math.floor((offsetX / width) * count));
}

export function swipeMediaIndex(
  current: number,
  deltaX: number,
  count: number,
  threshold = GALLERY_SWIPE_THRESHOLD_PX,
) {
  if (count <= 0 || Math.abs(deltaX) < threshold) {
    return current;
  }

  return deltaX < 0
    ? Math.min(count - 1, current + 1)
    : Math.max(0, current - 1);
}
