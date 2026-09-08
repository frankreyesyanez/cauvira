import { expect, test, type Page } from "@playwright/test";

test.setTimeout(60_000);

async function expectBagCount(page: Page, count: string) {
  const bag = page.getByTestId("bag-count");
  try {
    await expect(bag).toContainText(count, { timeout: 8_000 });
  } catch {
    await page.reload();
    await expect(bag).toContainText(count);
  }
}

test("adds coffee from the card and shows it in the bag", async ({ page }) => {
  await page.goto("/productos?q=cafe");
  await page
    .getByRole("article")
    .filter({ hasText: /café de especialidad/i })
    .getByRole("button", { name: "Agregar al carrito" })
    .click();
  await expectBagCount(page, "1");
  await page.getByRole("link", { name: /bolsa/i }).click();
  await expect(page).toHaveURL(/bolsa/);
  await expect(page.getByRole("heading", { name: /café de especialidad/i })).toBeVisible();
  await expect(page.getByText(/el pago en línea se habilitará/i)).toBeVisible();
});

test("requires ice-machine options then adds the priced line", async ({ page }) => {
  await page.goto("/productos/maquina-de-hielo-industrial-500");
  await expect(page.getByRole("radiogroup", { name: /voltaje/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Agregar al carrito" })).toBeDisabled();
  await page.getByRole("radio", { name: "440 V" }).check();
  await page.getByRole("radio", { name: "Completa" }).check();
  await page.getByRole("radio", { name: /ósmosis/i }).check();
  await expect(page.getByRole("button", { name: "Agregar al carrito" })).toBeEnabled();
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await expectBagCount(page, "1");
  await page.goto("/bolsa");
  await expect(page.getByText(/440 V/i)).toBeVisible();
  await expect(page.getByText(/subtotal/i)).toBeVisible();
});
