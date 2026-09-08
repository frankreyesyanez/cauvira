import { expect, test, type Page } from "@playwright/test";
import { getSeedUser } from "../src/db/seed-credentials";

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

test("sales receives 403 when posting a catalog mutation", async ({ page }) => {
  const sales = getSeedUser("sales");
  const suffix = `${Date.now()}`;

  await signIn(page, sales.email, sales.password);

  const response = await page.request.post("/backoffice/catalogo/nuevo", {
    form: {
      title: `Producto ventas ${suffix}`,
      slug: `producto-ventas-${suffix}`,
      summary: "Intento de mutación desde el rol de ventas.",
      purchaseMode: "quotation",
      published: "on",
    },
  });

  expect(response.status()).toBe(403);
});
