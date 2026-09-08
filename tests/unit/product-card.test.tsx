import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ProductCard } from "@/components/catalog/product-card";
import type { PurchaseMode } from "@/features/catalog/catalog.contracts";

const products = [
  {
    id: "direct",
    title: "Purificador compacto",
    slug: "purificador-compacto",
    summary: "Agua lista para servir.",
    purchaseMode: "direct_purchase",
    priceMinor: 489_000,
  },
  {
    id: "quote",
    title: "Cancha de pádel",
    slug: "cancha-padel",
    summary: "Proyecto instalado.",
    purchaseMode: "quotation",
    priceMinor: 4_890_000,
  },
  {
    id: "starting",
    title: "Máquina de hielo",
    slug: "maquina-hielo",
    summary: "Producción comercial.",
    purchaseMode: "starting_price",
    priceMinor: 4_890_000,
  },
  {
    id: "assisted",
    title: "Casa modular",
    slug: "casa-modular",
    summary: "Configuración a la medida.",
    purchaseMode: "assisted_contact",
    priceMinor: 4_890_000,
  },
] satisfies Array<{
  id: string;
  title: string;
  slug: string;
  summary: string;
  purchaseMode: PurchaseMode;
  priceMinor: number;
}>;

it("maps every purchase mode to its accurate public action", () => {
  render(
    <div>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>,
  );

  expect(screen.getByRole("link", { name: "Agregar al carrito" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Solicitar cotización" })).toBeVisible();
  expect(screen.getByText(/desde \$48,900/i)).toBeVisible();
  expect(
    screen.getByRole("link", { name: "Hablar con un especialista" }),
  ).toBeVisible();
});
