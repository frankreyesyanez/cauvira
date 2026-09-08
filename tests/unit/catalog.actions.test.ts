import { describe, expect, it, vi } from "vitest";
import { createCatalogActions } from "@/features/catalog/catalog.actions";

const categoryId = "3d03a1c7-7ca0-44e0-8fcb-1ec03f5d48d0";
const allowedRoles = ["administrator", "catalog_manager"] as const;

const createDependencies = () => ({
  authorize: vi.fn().mockResolvedValue(undefined),
  catalog: {
    createCategory: vi.fn().mockResolvedValue({ id: categoryId }),
    updateCategory: vi.fn().mockResolvedValue({ id: categoryId }),
    createProduct: vi.fn().mockResolvedValue({ id: "product-id" }),
    updateProduct: vi.fn().mockResolvedValue({ id: "product-id" }),
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
        optionGroups: [],
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

  it("returns type-specific category definition errors", async () => {
    const dependencies = createDependencies();
    const actions = createCatalogActions(dependencies);
    const formData = new FormData();
    formData.set("name", "Máquinas");
    formData.set("slug", "maquinas");
    formData.set("attributes.0.key", "output");
    formData.set("attributes.0.label", "Producción");
    formData.set("attributes.0.type", "measurement");
    formData.set("attributes.1.key", "control");
    formData.set("attributes.1.label", "Control");
    formData.set("attributes.1.type", "select");
    formData.set("attributes.1.options", "Manual, Manual");

    const result = await actions.createCategoryAction(formData);

    expect(result).toEqual({
      ok: false,
      fieldErrors: expect.objectContaining({
        "attributes.0.unit": expect.any(Array),
        "attributes.1.options": expect.any(Array),
      }),
    });
    expect(dependencies.catalog.createCategory).not.toHaveBeenCalled();
  });

  it("returns invalid parent failures as safe field errors", async () => {
    const dependencies = createDependencies();
    dependencies.catalog.createCategory.mockRejectedValue(
      Object.assign(new Error("La categoría superior no existe."), {
        field: "parentId",
      }),
    );
    const actions = createCatalogActions(dependencies);
    const formData = new FormData();
    formData.set("name", "Máquinas");
    formData.set("slug", "maquinas");
    formData.set("parentId", categoryId);

    await expect(actions.createCategoryAction(formData)).resolves.toEqual({
      ok: false,
      fieldErrors: {
        parentId: ["La categoría superior no existe."],
      },
    });
  });

  it("requires a price for starting-price products", async () => {
    const dependencies = createDependencies();
    const actions = createCatalogActions(dependencies);
    const formData = new FormData();
    formData.set("title", "Máquina de hielo industrial");
    formData.set("slug", "maquina-de-hielo-industrial");
    formData.set("categoryId", categoryId);
    formData.set("purchaseMode", "starting_price");
    formData.set("summary", "Equipo industrial listo para cotizar.");

    const result = await actions.createProductAction(formData);

    expect(result).toEqual({
      ok: false,
      fieldErrors: expect.objectContaining({
        priceMinor: expect.any(Array),
      }),
    });
    expect(dependencies.catalog.getCategoryWithAttributes).not.toHaveBeenCalled();
  });

  it("authorizes category and product edits before persistence", async () => {
    const dependencies = createDependencies();
    const actions = createCatalogActions(dependencies);
    const categoryForm = new FormData();
    categoryForm.set("name", "Máquinas de hielo");
    categoryForm.set("slug", "maquinas-de-hielo");
    const productForm = new FormData();
    productForm.set("title", "Máquina de hielo industrial");
    productForm.set("slug", "maquina-de-hielo-industrial");
    productForm.set("categoryId", categoryId);
    productForm.set("purchaseMode", "quotation");
    productForm.set("price", "289900");
    productForm.set("summary", "Equipo industrial listo para cotizar.");
    productForm.set("attribute.daily_output", "500");

    await actions.updateCategoryAction(categoryId, categoryForm);
    await actions.updateProductAction("product-id", productForm);

    expect(dependencies.authorize).toHaveBeenNthCalledWith(1, allowedRoles);
    expect(dependencies.authorize).toHaveBeenNthCalledWith(2, allowedRoles);
    expect(dependencies.catalog.updateCategory).toHaveBeenCalledWith(
      categoryId,
      expect.objectContaining({ name: "Máquinas de hielo" }),
    );
    expect(dependencies.catalog.updateProduct).toHaveBeenCalledWith(
      "product-id",
      expect.objectContaining({
        product: expect.objectContaining({ title: "Máquina de hielo industrial" }),
      }),
    );
  });

  it.each([
    ["createCategoryAction", [new FormData()]],
    ["createProductAction", [new FormData()]],
    ["updateCategoryAction", [categoryId, new FormData()]],
    ["updateProductAction", ["product-id", new FormData()]],
  ] as const)(
    "does not run %s when server authorization fails",
    async (actionName, args) => {
      const dependencies = createDependencies();
      dependencies.authorize.mockRejectedValue(new Error("Forbidden"));
      const actions = createCatalogActions(dependencies);

      await expect(
        Reflect.apply(actions[actionName], actions, args),
      ).rejects.toThrow(
        /forbidden/i,
      );
      expect(dependencies.catalog.createCategory).not.toHaveBeenCalled();
      expect(dependencies.catalog.createProduct).not.toHaveBeenCalled();
    },
  );
});
