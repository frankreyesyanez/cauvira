import { render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { BagView } from "@/components/catalog/bag-view";
import type { CartLineView, CartView } from "@/features/cart/cart.service";
import { formatMxn } from "@/lib/money";

vi.mock("@/features/cart/cart.mutations", () => ({
  updateCartItemQuantityAction: vi.fn(),
  removeCartItemAction: vi.fn(),
}));

function line(overrides: Partial<CartLineView> = {}): CartLineView {
  return {
    id: "line-valid",
    productId: "prod-coffee",
    slug: "cafe-especialidad-grano-1kg",
    title: "Café de especialidad 1 kg",
    quantity: 2,
    choiceIds: [],
    choiceLabels: ["Tueste medio"],
    unitMinor: 489_000,
    lineMinor: 978_000,
    invalid: false,
    coverUrl: "https://cdn.example/coffee.jpg",
    ...overrides,
  };
}

function cart(overrides: Partial<CartView> = {}): CartView {
  return {
    id: "cart-1",
    items: [],
    itemCount: 0,
    subtotalMinor: 0,
    ...overrides,
  };
}

it("shows empty-bag copy and a catalog link", () => {
  render(<BagView bagCount={0} cart={cart()} categories={[]} />);

  expect(screen.getByText("Tu bolsa está vacía.")).toBeVisible();
  expect(screen.getByRole("link", { name: "Ver catálogo" })).toHaveAttribute(
    "href",
    "/productos",
  );
});

it("renders a valid line with cover, title, choices, unit price, and quantity", () => {
  const valid = line();
  render(
    <BagView
      bagCount={2}
      cart={cart({
        items: [valid],
        itemCount: 2,
        subtotalMinor: valid.lineMinor ?? 0,
      })}
      categories={[]}
    />,
  );

  const row = screen.getByRole("listitem");
  expect(within(row).getByRole("img", { name: valid.title })).toHaveAttribute(
    "src",
    valid.coverUrl,
  );
  expect(
    within(row).getByRole("link", { name: valid.title }),
  ).toHaveAttribute("href", `/productos/${valid.slug}`);
  expect(within(row).getByText("Tueste medio")).toBeVisible();
  expect(within(row).getByText(formatMxn(valid.unitMinor!))).toBeVisible();

  const quantity = within(row).getByRole("combobox", { name: /cantidad/i });
  expect(quantity).toHaveValue("2");
  expect(within(quantity).getAllByRole("option")).toHaveLength(99);
  expect(within(quantity).getByRole("option", { name: "1" })).toBeInTheDocument();
  expect(within(quantity).getByRole("option", { name: "99" })).toBeInTheDocument();
  expect(within(row).getByRole("button", { name: "Quitar" })).toBeVisible();
});

it("keeps invalid lines visible but out of the subtotal", () => {
  const valid = line({
    id: "line-valid",
    quantity: 2,
    unitMinor: 489_000,
    lineMinor: 978_000,
  });
  const invalid = line({
    id: "line-invalid",
    productId: "prod-ice",
    slug: "maquina-de-hielo-industrial-500",
    title: "Máquina de hielo industrial",
    quantity: 3,
    choiceLabels: [],
    unitMinor: null,
    lineMinor: null,
    invalid: true,
    coverUrl: null,
  });

  render(
    <BagView
      bagCount={5}
      cart={cart({
        items: [valid, invalid],
        itemCount: 5,
        subtotalMinor: 978_000,
      })}
      categories={[]}
    />,
  );

  const rows = screen.getAllByRole("listitem");
  expect(rows).toHaveLength(2);

  expect(
    screen.getByText(
      "Esta combinación ya no está disponible. Vuelve al producto para elegir de nuevo.",
    ),
  ).toBeVisible();
  expect(
    screen.getByRole("link", { name: /vuelve al producto para elegir de nuevo/i }),
  ).toHaveAttribute("href", `/productos/${invalid.slug}`);

  expect(screen.queryByText(formatMxn(489_000 * 3))).toBeNull();
  expect(screen.getByText("Subtotal")).toBeVisible();
  expect(screen.getByText(formatMxn(978_000))).toBeVisible();
  expect(
    screen.getByText("El pago en línea se habilitará en el siguiente paso."),
  ).toBeVisible();
  expect(screen.queryByRole("button", { name: /pagar|mercado pago|checkout/i })).toBeNull();

  expect(within(rows[1]!).getByRole("button", { name: "Quitar" })).toBeVisible();
});

it("shows Quitar on unpublished lines without linking an empty slug", () => {
  render(
    <BagView
      bagCount={1}
      cart={cart({
        items: [
          line({
            id: "line-gone",
            productId: "prod-gone",
            slug: "",
            title: "",
            quantity: 1,
            choiceLabels: [],
            unitMinor: null,
            lineMinor: null,
            invalid: true,
            coverUrl: null,
          }),
        ],
        itemCount: 1,
        subtotalMinor: 0,
      })}
      categories={[]}
    />,
  );

  expect(
    screen.getByText(
      "Esta combinación ya no está disponible. Vuelve al producto para elegir de nuevo.",
    ),
  ).toBeVisible();
  expect(screen.queryByRole("link", { name: /producto/i })).toBeNull();
  expect(document.querySelector('a[href="/productos/"]')).toBeNull();
  expect(screen.getByRole("button", { name: "Quitar" })).toBeVisible();
  expect(screen.getByText(formatMxn(0))).toBeVisible();
});
