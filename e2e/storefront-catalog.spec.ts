import { expect, test } from "@playwright/test";

test("searches and opens a quotation product", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: /buscar/i }).fill("montacargas");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByRole("heading", { name: /montacargas eléctrico/i })).toBeVisible();
  await page.getByRole("link", { name: /montacargas eléctrico/i }).click();
  await expect(page).toHaveURL(/productos\/montacargas-electrico/);
  await expect(page.getByText(/desde/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Agregar al carrito" })).toBeVisible();
});
