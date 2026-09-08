import { render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { HomeView } from "@/components/catalog/home-view";
import type { PublishedProductSummary } from "@/features/catalog/catalog.repository";

vi.mock("@/features/cart/cart.mutations", () => ({
  addToCartAction: vi.fn(),
}));

const publishedProducts = [
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

it("identifies Cauvira as a commerce experience", () => {
  render(<HomeView products={[]} categories={[]} />);
  expect(
    screen.getByRole("heading", { name: /equipa lo que sigue/i }),
  ).toBeVisible();
  expect(screen.getByRole("search")).toBeVisible();
});

it("shows purchase actions and product cards in the first viewport", () => {
  render(<HomeView products={publishedProducts} categories={[]} />);

  const viewport = screen.getByTestId("store-first-viewport");
  const addActions = [
    ...within(viewport).queryAllByRole("button", { name: "Agregar al carrito" }),
    ...within(viewport).queryAllByRole("link", { name: "Agregar al carrito" }),
  ];

  expect(addActions).toHaveLength(4);
  for (const action of addActions) {
    expect(action).toBeVisible();
  }
  expect(within(viewport).getAllByText(/desde \$/i)).toHaveLength(4);

  const iceCard = within(viewport)
    .getByRole("heading", { level: 3, name: "Máquina de hielo" })
    .closest("article");
  expect(iceCard).toBeTruthy();
  expect(
    within(iceCard!)
      .getByRole("link", { name: "Agregar al carrito" })
      .getAttribute("href"),
  ).toMatch(/\/productos\/maquina-hielo$/);

  const coffeeCard = within(viewport)
    .getByRole("heading", { level: 3, name: "Purificador compacto" })
    .closest("article");
  expect(coffeeCard).toBeTruthy();
  expect(
    within(coffeeCard!).getByRole("button", { name: "Agregar al carrito" }),
  ).toBeVisible();
  expect(coffeeCard!.querySelector('a[href$="#comprar"]')).toBeNull();

  const productCards = within(viewport).getAllByRole("article");
  expect(productCards.length).toBeGreaterThanOrEqual(3);
  expect(
    within(productCards[0]!).getByRole("heading", {
      level: 3,
      name: "Purificador compacto",
    }),
  ).toBeVisible();
  expect(
    within(productCards[1]!).getByRole("heading", {
      level: 3,
      name: "Cancha de pádel",
    }),
  ).toBeVisible();
  expect(
    within(productCards[2]!).getByRole("heading", {
      level: 3,
      name: "Máquina de hielo",
    }),
  ).toBeVisible();
});

it("shows an honest empty merchandising message without products", () => {
  render(<HomeView products={[]} categories={[]} />);
  const viewport = screen.getByTestId("store-first-viewport");
  expect(
    within(viewport).getByRole("heading", { name: /sin productos publicados/i }),
  ).toBeVisible();
  expect(
    within(viewport).getAllByText(/aún no hay productos publicados en el catálogo/i),
  ).toHaveLength(2);
});
