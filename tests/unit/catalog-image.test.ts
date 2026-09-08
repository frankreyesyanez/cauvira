import { expect, it } from "vitest";
import { catalogImageSrc } from "@/lib/catalog-image";

it("returns a public catalog photo for seeded product slugs", () => {
  expect(catalogImageSrc("montacargas-electrico")).toBe(
    "/catalog/montacargas-electrico.jpg",
  );
});

it("returns null when the product has no catalog photo", () => {
  expect(catalogImageSrc("purificador-compacto")).toBeNull();
});
