import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ProductConfigure } from "@/components/catalog/product-configure";
import type { CatalogOptionGroup } from "@/features/catalog/pricing";

vi.mock("@/features/cart/cart.mutations", () => ({
  addToCartAction: vi.fn(),
}));

const optionGroups: CatalogOptionGroup[] = [
  {
    id: "g-volt",
    name: "Voltaje",
    required: true,
    sortOrder: 0,
    values: [
      { id: "v-220", label: "220 V", priceDeltaMinor: 0, sortOrder: 0 },
      { id: "v-440", label: "440 V", priceDeltaMinor: 850_000, sortOrder: 1 },
    ],
  },
  {
    id: "g-install",
    name: "Instalación",
    required: true,
    sortOrder: 1,
    values: [
      { id: "i-basic", label: "Básica", priceDeltaMinor: 0, sortOrder: 0 },
      { id: "i-full", label: "Completa", priceDeltaMinor: 1_250_000, sortOrder: 1 },
    ],
  },
];

function renderConfigure(
  groups: CatalogOptionGroup[] = optionGroups,
  priceMinor = 18_990_000,
) {
  return render(
    <ProductConfigure
      optionGroups={groups}
      priceMinor={priceMinor}
      productId="ice-1"
    />,
  );
}

it("names radio groups by id and keeps submit disabled until required choices exist", () => {
  renderConfigure();

  expect(screen.getByRole("radiogroup", { name: /voltaje/i })).toBeVisible();
  expect(screen.getByRole("radiogroup", { name: /instalación/i })).toBeVisible();
  expect(document.querySelectorAll('input[type="radio"][name="g-volt"]')).toHaveLength(
    2,
  );
  expect(
    document.querySelectorAll('input[type="radio"][name="g-install"]'),
  ).toHaveLength(2);

  const live = screen.getByText(/\$189,900/);
  expect(live.closest("[aria-live]")).toHaveAttribute("aria-live", "polite");
  expect(screen.getByRole("button", { name: "Agregar al carrito" })).toBeDisabled();
});

it("updates the live total from selected deltas and submits choice ids, not money", () => {
  renderConfigure();

  fireEvent.click(screen.getByRole("radio", { name: /440 v/i }));
  expect(screen.getByText(/\$198,400/)).toBeVisible();

  fireEvent.click(screen.getByRole("radio", { name: /completa/i }));
  expect(screen.getByText(/\$210,900/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Agregar al carrito" })).toBeEnabled();

  expect(document.querySelector('input[name="productId"]')).toHaveValue("ice-1");
  const choiceIds = [...document.querySelectorAll('input[name="choiceId"]')].map(
    (input) => (input as HTMLInputElement).value,
  );
  expect(choiceIds).toEqual(expect.arrayContaining(["v-440", "i-full"]));
  expect(document.querySelector('input[name="unitMinor"]')).toBeNull();
  expect(document.querySelector('input[name="priceMinor"]')).toBeNull();
});

it("marks and focuses the first incomplete required group on click without a selection", () => {
  renderConfigure();

  fireEvent.click(screen.getByRole("button", { name: "Agregar al carrito" }));

  const voltaje = screen.getByRole("radiogroup", { name: /voltaje/i });
  expect(voltaje).toHaveAttribute("aria-invalid", "true");
  expect(voltaje).toHaveFocus();
});

it("submits only productId when the product has no option groups", () => {
  renderConfigure([], 38_900);

  expect(screen.getByText(/\$389/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Agregar al carrito" })).toBeEnabled();
  expect(document.querySelector('input[name="productId"]')).toHaveValue("ice-1");
  expect(document.querySelectorAll('input[name="choiceId"]')).toHaveLength(0);
});
