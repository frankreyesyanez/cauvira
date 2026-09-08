import { createRequire } from "node:module";
import { expect, test, type Page } from "@playwright/test";
import { getSeedUser } from "../src/db/seed-credentials";

const { encodeReply } = createRequire(import.meta.url)(
  "next/dist/compiled/react-server-dom-webpack/client.node.js",
) as {
  encodeReply(value: unknown): Promise<string | FormData>;
};

test.describe.configure({ mode: "serial" });

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/ingresar");
  await page.getByLabel(/correo/i).fill(email);
  await page.getByLabel(/contraseña/i).fill(password);
  await page.getByRole("button", { name: /ingresar/i }).click();
  await page.waitForURL(/\/backoffice/);
}

test("catalog manager publishes a product that appears in public search", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const catalogManager = getSeedUser("catalog_manager");
  const suffix = `${Date.now()}`;
  const categoryName = `Atributo e2e ${suffix}`;
  const categorySlug = `atributo-e2e-${suffix}`;
  const productTitle = `Producto e2e ${suffix}`;
  const productSlug = `producto-e2e-${suffix}`;

  await signIn(page, catalogManager.email, catalogManager.password);

  await page.goto("/backoffice/categorias");
  await page.getByLabel("Nombre").fill(categoryName);
  await page.getByLabel("Slug").fill(categorySlug);
  await page.getByRole("button", { name: "Agregar atributo" }).click();
  await page.getByLabel("Clave").fill("finish");
  await page.getByLabel("Etiqueta").fill("Acabado");
  await page.getByRole("button", { name: "Guardar categoría" }).click();
  await expect(page.getByRole("status")).toContainText(/categoría guardada/i);

  await page.goto("/backoffice/catalogo/nuevo");
  await page.getByLabel("Nombre del producto").fill(productTitle);
  await page.getByLabel("Slug").fill(productSlug);
  await page.getByLabel("Resumen").fill(
    "Producto de prueba para el corte vertical del catálogo.",
  );
  await page.getByLabel("Categoría").selectOption({ label: categoryName });
  await page.getByLabel("Modalidad de compra").selectOption("quotation");
  await page.getByLabel("Precio público (MXN)").fill("28990");
  await page.getByRole("button", { name: "Guardar producto" }).click();
  await expect(page.getByRole("status")).toContainText(/producto guardado/i);

  await page.goto(`/backoffice/catalogo?q=${encodeURIComponent(productTitle)}`);
  const row = page.locator("tr", { hasText: productTitle });
  await expect(row.getByText("Borrador")).toBeVisible();
  await row.getByRole("link", { name: "Editar" }).click();
  await page.getByLabel("Publicar al guardar").check();
  await page.getByRole("button", { name: "Actualizar producto" }).click();
  await expect(page.getByRole("status")).toContainText(/producto actualizado/i);

  await page.goto("/");
  await page.getByRole("searchbox", { name: /buscar/i }).fill(productTitle);
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(
    page.getByRole("heading", { name: productTitle, exact: true }),
  ).toBeVisible();
});

async function readCreateProductActionId(page: Page) {
  await expect(
    page.locator("form.admin-form input[name^='$ACTION_ID_']"),
  ).toHaveCount(1);

  const actionFields = await page
    .locator("form.admin-form input[type='hidden']")
    .evaluateAll((inputs) =>
      inputs
        .filter((input) => input instanceof HTMLInputElement)
        .filter((input) => input.name.startsWith("$ACTION_"))
        .map((input) => ({ name: input.name, value: input.value })),
    );

  const idField = actionFields.find((field) => field.name.startsWith("$ACTION_ID_"));
  const actionId = idField?.name.slice("$ACTION_ID_".length) ?? "";
  expect(actionId, "createProductAction id from the new-product form").toMatch(
    /^[0-9a-f]{42}$/i,
  );

  return {
    actionId,
    actionFields: Object.fromEntries(
      actionFields.map((field) => [field.name, field.value]),
    ),
  };
}

test("sales receives 403 when posting a catalog mutation", async ({
  browser,
  page,
}) => {
  const catalogManager = getSeedUser("catalog_manager");
  const sales = getSeedUser("sales");
  const suffix = `${Date.now()}`;

  await signIn(page, catalogManager.email, catalogManager.password);
  await page.goto("/backoffice/catalogo/nuevo");
  await expect(page.getByRole("heading", { name: "Nuevo producto" })).toBeVisible();
  const { actionId } = await readCreateProductActionId(page);
  const origin = new URL(page.url()).origin;

  const salesContext = await browser.newContext({ baseURL: origin });
  const salesPage = await salesContext.newPage();
  try {
    await signIn(salesPage, sales.email, sales.password);

    const productFormData = new FormData();
    productFormData.append("title", `Producto ventas ${suffix}`);
    productFormData.append("slug", `producto-ventas-${suffix}`);
    productFormData.append("summary", "Intento de mutación desde el rol de ventas.");
    productFormData.append("purchaseMode", "quotation");
    const encodedBody = await encodeReply([productFormData]);

    const headers: Record<string, string> = {
      Accept: "text/x-component",
      "Next-Action": actionId,
      origin,
    };

    const actionUrl = `${origin}/backoffice/catalogo/nuevo`;
    const response =
      typeof encodedBody === "string"
        ? await salesPage.request.post(actionUrl, {
            headers: {
              ...headers,
              "Content-Type": "text/plain;charset=UTF-8",
            },
            data: encodedBody,
          })
        : await salesPage.request.post(actionUrl, {
            headers,
            multipart: Object.fromEntries(
              [...encodedBody.entries()].filter(
                (entry): entry is [string, string] => typeof entry[1] === "string",
              ),
            ),
          });

    expect(response.headers()["x-nextjs-action-not-found"]).not.toBe("1");
    expect(response.status()).toBe(403);
  } finally {
    await salesContext.close();
  }
});
