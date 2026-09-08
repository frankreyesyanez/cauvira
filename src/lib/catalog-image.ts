const catalogImages = new Set([
  "maquina-de-hielo-industrial-500",
  "maquina-de-hielo-escamas-1000",
  "montacargas-electrico",
  "montacargas-diesel-3t",
  "cafe-especialidad-grano-1kg",
  "capsulas-cafe-compatibles-50",
  "cancha-de-padel-panoramica",
  "cancha-de-padel-indoor",
]);

export function catalogImageSrc(slug: string) {
  return catalogImages.has(slug) ? `/catalog/${slug}.jpg` : null;
}
