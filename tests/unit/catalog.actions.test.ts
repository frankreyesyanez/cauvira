import { describe, expect, it, vi } from "vitest";
import { createCatalogActions } from "@/features/catalog/catalog.actions";

const categoryId = "3d03a1c7-7ca0-44e0-8fcb-1ec03f5d48d0";
const allowedRoles = ["administrator", "catalog_manager"] as const;

const createDependencies = () => ({
  authorize: vi.fn().mockResolvedValue(undefined),
  catalog: {
    createCategory: vi.fn().mockResolvedValue({ id: categoryId }),
    createProduct: vi.fn().mockResolvedValue({ id: "product-id" }),
    getCategoryWithAttributes: vi.fn().mockResolvedValue({
      id: categoryId,
      attributes: [
        {
          id: "output",
          key: "daily_output",
          label: "Producción diaria",
          type: "measurement",
          required: true,
          unit: "kg/día",
          options: [],
        },
      ],
    }),
  },
});

describe("catalog actions", () => {
  it("authorizes category creation and submits parsed attributes", async () => {
    const dependencies = createDependencies();
    const actions = createCatalogActions(dependencies);
    const formData = new FormData();
    formData.set("name", "Máquinas de hielo");
    formData.set("slug", "maquinas-de-hielo");
    formData.set("parentId", "");
    formData.set("attributes.0.key", "daily_output");
    formData.set("attributes.0.label", "Producción diaria");
    formData.set("attributes.0.type", "measurement");
    formData.set("attributes.0.required", "on");
    formData.set("attributes.0.unit", "kg/día");

    await expect(actions.createCategoryAction(formData)).resolves.toEqual({
      ok: true,
      id: categoryId,
    });
    expect(dependencies.authorize).toHaveBeenCalledWith(allowedRoles);
    expect(dependencies.catalog.createCategory).toHaveBeenCalledWith({
      name: "Máquinas de hielo",
      slug: "maquinas-de-hielo",
      parentId: null,
      attributes: [
        {
          key: "daily_output",
          label: "Producción diaria",
          type: "measurement",
          required: true,
          filterable: false,
          comparable: false,
          unit: "kg/día",
          options: [],
        },
      ],
    });
  });

  it("converts product pesos and dynamic fields to service contracts", async () => {
    const dependencies = createDependencies();
    const actions = createCatalogActions(dependencies);
    const formData = new FormData();
    formData.set("title", "Máquina de hielo industrial");
    formData.set("slug", "maquina-de-hielo-industrial");
    formData.set("categoryId", categoryId);
    formData.set("purchaseMode", "starting_price");
    formData.set("price", "125000.50");
    formData.set("summary", "Equipo industrial listo para cotizar.");
    formData.set("description", "Descripción detallada.");
    formData.set("attribute.daily_output", "500");

    await expect(actions.createProductAction(formData)).resolves.toEqual({
      ok: true,
      id: "product-id",
    });
    expect(dependencies.authorize).toHaveBeenCalledWith(allowedRoles);
    expect(dependencies.catalog.createProduct).toHaveBeenCalledWith({
      product: {
        title: "Máquina de hielo industrial",
        slug: "maquina-de-hielo-industrial",
        categoryId,
        purchaseMode: "starting_price",
        priceMinor: 12500050,
        summary: "Equipo industrial listo para cotizar.",
        description: "Descripción detallada.",
        published: false,
      },
      attributes: {
        daily_output: { value: 500, unit: "kg/día" },
      },
    });
  });

  it("returns field errors without attempting invalid persistence", async () => {
    const dependencies = createDependencies();
    const actions = createCatalogActions(dependencies);
    const formData = new FormData();
    formData.set("name", "A");
    formData.set("slug", "slug inválido");

    const result = await actions.createCategoryAction(formData);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.name).toBeDefined();
      expect(result.fieldErrors.slug).toBeDefined();
    }
    expect(dependencies.catalog.createCategory).not.toHaveBeenCalled();
  });

  it.each(["createCategoryAction", "createProductAction"] as const)(
    "does not run %s when server authorization fails",
    async (actionName) => {
      const dependencies = createDependencies();
      dependencies.authorize.mockRejectedValue(new Error("Forbidden"));
      const actions = createCatalogActions(dependencies);

      await expect(actions[actionName](new FormData())).rejects.toThrow(
        /forbidden/i,
      );
      expect(dependencies.catalog.createCategory).not.toHaveBeenCalled();
      expect(dependencies.catalog.createProduct).not.toHaveBeenCalled();
    },
  );
});
