import { render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ProductCard } from "@/components/catalog/product-card";
import type { PublishedProductSummary } from "@/features/catalog/catalog.repository";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/features/cart/cart.mutations", () => ({
  addToCartAction: vi.fn(),
}));

const products = [
  {
    id: "direct",
    title: "Purificador compacto",
    slug: "purificador-compacto",
    summary: "Agua lista para servir.",
    purchaseMode: "direct_purchase",
    priceMinor: 489_000,
    hasOptions: false,
    images: [],
  },
  {
    id: "quote",
    title: "Cancha de pádel",
    slug: "cancha-padel",
    summary: "Proyecto instalado.",
    purchaseMode: "quotation",
    priceMinor: 4_890_000,
    hasOptions: false,
    images: [],
  },
  {
    id: "starting",
    title: "Máquina de hielo",
    slug: "maquina-hielo",
    summary: "Producción comercial.",
    purchaseMode: "starting_price",
    priceMinor: 4_890_000,
    hasOptions: true,
    images: [],
  },
  {
    id: "assisted",
    title: "Casa modular",
    slug: "casa-modular",
    summary: "Configuración a la medida.",
    purchaseMode: "assisted_contact",
    priceMinor: 4_890_000,
    hasOptions: false,
    images: [],
  },
] satisfies PublishedProductSummary[];

function addToCartControls(scope: Document | HTMLElement = document.body) {
  const root = scope === document.body ? screen : within(scope as HTMLElement);
  return [
    ...root.queryAllByRole("button", { name: "Agregar al carrito" }),
    ...root.queryAllByRole("link", { name: "Agregar al carrito" }),
  ];
}

it("shows a starting price and Agregar al carrito on every card", () => {
  render(
    <div>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>,
  );

  const ctas = addToCartControls();
  expect(ctas).toHaveLength(4);
  for (const control of ctas) {
    expect(control).toBeVisible();
  }

  expect(screen.getAllByText(/desde \$/i)).toHaveLength(4);
  expect(screen.getByText(/desde \$4,890/i)).toBeVisible();
  expect(screen.getAllByText(/desde \$48,900/i).length).toBeGreaterThanOrEqual(1);

  const iceCard = screen
    .getByRole("heading", { name: "Máquina de hielo" })
    .closest("article");
  expect(iceCard).toBeTruthy();
  const iceCta = within(iceCard!).getByRole("link", { name: "Agregar al carrito" });
  expect(iceCta.getAttribute("href")).toMatch(/\/productos\/maquina-hielo$/);

  const coffeeCard = screen
    .getByRole("heading", { name: "Purificador compacto" })
    .closest("article");
  expect(coffeeCard).toBeTruthy();
  expect(
    within(coffeeCard!).getByRole("button", { name: "Agregar al carrito" }),
  ).toBeVisible();
  expect(
    within(coffeeCard!).queryByRole("link", { name: "Agregar al carrito" }),
  ).toBeNull();
  expect(coffeeCard!.querySelector('a[href$="#comprar"]')).toBeNull();
});
