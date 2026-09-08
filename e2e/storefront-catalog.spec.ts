import { expect, test } from "@playwright/test";

test("searches and opens a quotation product", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: /buscar/i }).fill("montacargas");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByRole("heading", { name: /montacargas eléctrico/i })).toBeVisible();
  await page.getByRole("link", { name: "Solicitar cotización" }).click();
  await expect(page).toHaveURL(/productos\/montacargas-electrico/);
});
