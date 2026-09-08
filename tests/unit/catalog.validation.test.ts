import { describe, expect, it } from "vitest";
import {
  createCategorySchema,
  createProductSchema,
} from "@/features/catalog/catalog.validation";

const validCategory = {
  name: "Máquinas de hielo",
  slug: "maquinas-de-hielo",
  parentId: null,
  attributes: [],
};

describe("createCategorySchema", () => {
  it("requires a nonempty unit for measurement definitions", () => {
    const result = createCategorySchema.safeParse({
      ...validCategory,
      attributes: [{
        key: "output",
        label: "Producción",
        type: "measurement",
        required: false,
        filterable: false,
        comparable: false,
        unit: null,
        options: [],
      }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ path: ["attributes", 0, "unit"] }),
      );
    }
  });

  it.each(["select", "multiselect"] as const)(
    "requires unique nonempty options for %s definitions",
    (type) => {
      const result = createCategorySchema.safeParse({
        ...validCategory,
        attributes: [{
          key: "control",
          label: "Control",
          type,
          required: false,
          filterable: false,
          comparable: false,
          unit: null,
          options: ["Manual", "Manual"],
        }],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({ path: ["attributes", 0, "options"] }),
        );
      }
    },
  );
});

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

  it("rejects starting price without a price", () => {
    expect(() =>
      createProductSchema.parse({ ...valid, priceMinor: null }),
    ).toThrow(/priceMinor/);
  });

  it("requires a positive price for quotation products", () => {
    expect(() =>
      createProductSchema.parse({
        ...valid,
        purchaseMode: "quotation",
        priceMinor: null,
      }),
    ).toThrow(/priceMinor/);
  });

  it("rejects an option group with no values", () => {
    const result = createProductSchema.safeParse({
      ...valid,
      optionGroups: [{
        name: "Talla",
        required: true,
        sortOrder: 0,
        values: [],
      }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative surcharge", () => {
    const result = createProductSchema.safeParse({
      ...valid,
      optionGroups: [{
        name: "Talla",
        required: true,
        sortOrder: 0,
        values: [{ label: "M", priceDeltaMinor: -1, sortOrder: 0 }],
      }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts priced groups", () => {
    expect(
      createProductSchema.parse({
        ...valid,
        optionGroups: [{
          name: "Talla",
          required: true,
          sortOrder: 0,
          values: [{ label: "M", priceDeltaMinor: 0, sortOrder: 0 }],
        }],
      }).optionGroups,
    ).toHaveLength(1);
  });

  it("parses ice-machine and padel seed option groups", () => {
    const ice = createProductSchema.parse({
      ...valid,
      slug: "maquina-de-hielo-industrial-500",
      priceMinor: 18_990_000,
      optionGroups: [
        {
          name: "Voltaje",
          required: true,
          sortOrder: 0,
          values: [
            { label: "220 V", priceDeltaMinor: 0, sortOrder: 0 },
            { label: "440 V", priceDeltaMinor: 850_000, sortOrder: 1 },
          ],
        },
        {
          name: "Instalación",
          required: true,
          sortOrder: 1,
          values: [
            { label: "Básica", priceDeltaMinor: 0, sortOrder: 0 },
            { label: "Completa", priceDeltaMinor: 1_250_000, sortOrder: 1 },
          ],
        },
        {
          name: "Tratamiento de agua",
          required: true,
          sortOrder: 2,
          values: [
            { label: "Sin tratamiento", priceDeltaMinor: 0, sortOrder: 0 },
            { label: "Ósmosis", priceDeltaMinor: 1_890_000, sortOrder: 1 },
          ],
        },
      ],
    });
    const padel = createProductSchema.parse({
      ...valid,
      title: "Cancha de pádel panorámica",
      slug: "cancha-de-padel-panoramica",
      purchaseMode: "assisted_contact",
      priceMinor: 89_000_000,
      optionGroups: [
        {
          name: "Piso",
          required: true,
          sortOrder: 0,
          values: [
            { label: "Césped sintético", priceDeltaMinor: 0, sortOrder: 0 },
            { label: "Resina", priceDeltaMinor: 4_500_000, sortOrder: 1 },
          ],
        },
      ],
    });
    const coffee = createProductSchema.parse({
      ...valid,
      title: "Café de especialidad en grano 1 kg",
      slug: "cafe-especialidad-grano-1kg",
      purchaseMode: "direct_purchase",
      priceMinor: 38_900,
      optionGroups: [],
    });

    expect(ice.optionGroups).toHaveLength(3);
    expect(padel.optionGroups[0]?.name).toBe("Piso");
    expect(coffee.optionGroups).toEqual([]);
  });
});
