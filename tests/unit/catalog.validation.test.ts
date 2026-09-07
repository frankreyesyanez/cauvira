import { describe, expect, it } from "vitest";
import { createProductSchema } from "@/features/catalog/catalog.validation";

describe("createProductSchema", () => {
  const valid = {
    title: "Máquina de hielo 500 kg",
    slug: "maquina-hielo-500-kg",
    categoryId: "3d03a1c7-7ca0-44e0-8fcb-1ec03f5d48d0",
    purchaseMode: "starting_price",
    priceMinor: 4_890_000,
    summary: "Producción industrial para comercios y proyectos.",
    published: true,
  };

  it("accepts a starting-price product with a positive MXN amount", () => {
    expect(createProductSchema.parse(valid).priceMinor).toBe(4_890_000);
  });

  it("rejects direct purchase without a price", () => {
    expect(() =>
      createProductSchema.parse({ ...valid, purchaseMode: "direct_purchase", priceMinor: null }),
    ).toThrow(/priceMinor/);
  });

  it("allows quotation products without a public price", () => {
    expect(
      createProductSchema.parse({ ...valid, purchaseMode: "quotation", priceMinor: null }).priceMinor,
    ).toBeNull();
  });
});
