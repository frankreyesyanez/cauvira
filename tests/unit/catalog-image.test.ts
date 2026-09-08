import { expect, it } from "vitest";
import {
  catalogImageSrc,
  catalogMediaUrls,
  hoverScrubIndex,
  swipeMediaIndex,
} from "@/lib/catalog-image";

it("prefers the first database image url over a seeded slug file", () => {
  expect(
    catalogImageSrc(
      [{ url: "https://cdn.example/cover.jpg" }],
      "montacargas-electrico",
    ),
  ).toBe("https://cdn.example/cover.jpg");
});

it("falls back to a public catalog photo when images are empty", () => {
  expect(catalogImageSrc([], "montacargas-electrico")).toBe(
    "/catalog/montacargas-electrico.jpg",
  );
});

it("returns null when the product has no images and no catalog photo", () => {
  expect(catalogImageSrc([], "purificador-compacto")).toBeNull();
});

it("lists database urls and maps hover and swipe to an index", () => {
  expect(
    catalogMediaUrls(
      [{ url: "https://cdn.example/a.jpg" }, { url: "https://cdn.example/b.jpg" }],
      "montacargas-electrico",
    ),
  ).toEqual(["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"]);
  expect(catalogMediaUrls([], "montacargas-electrico")).toEqual([
    "/catalog/montacargas-electrico.jpg",
  ]);

  expect(hoverScrubIndex(150, 200, 2)).toBe(1);
  expect(hoverScrubIndex(49, 200, 2)).toBe(0);
  expect(swipeMediaIndex(0, -29, 2)).toBe(0);
  expect(swipeMediaIndex(0, -30, 2)).toBe(1);
  expect(swipeMediaIndex(1, 30, 2)).toBe(0);
});
