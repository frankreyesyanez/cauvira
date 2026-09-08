import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AddToCartButton } from "@/components/catalog/add-to-cart-button";
import { addToCartAction } from "@/features/cart/cart.mutations";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/features/cart/cart.mutations", () => ({
  addToCartAction: vi.fn(),
}));

const addToCart = vi.mocked(addToCartAction);

beforeEach(() => {
  refresh.mockReset();
  addToCart.mockReset();
});

it("submits productId with the Agregar al carrito label when there are no options", () => {
  render(<AddToCartButton productId="coffee-1" />);

  expect(screen.getByRole("button", { name: "Agregar al carrito" })).toBeVisible();

  const productId = document.querySelector('input[name="productId"]');
  expect(productId).toHaveAttribute("type", "hidden");
  expect(productId).toHaveValue("coffee-1");
  expect(document.querySelectorAll('input[name="choiceId"]')).toHaveLength(0);
});

it("shows a Spanish error when add fails", async () => {
  addToCart.mockResolvedValue({ ok: false, error: "product_unavailable" });
  render(<AddToCartButton productId="coffee-1" />);

  fireEvent.click(screen.getByRole("button", { name: "Agregar al carrito" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Este producto no está disponible.");
  expect(refresh).not.toHaveBeenCalled();
});

it("refreshes after a successful add", async () => {
  addToCart.mockResolvedValue({ ok: true, itemCount: 1 });
  render(<AddToCartButton productId="coffee-1" />);

  fireEvent.click(screen.getByRole("button", { name: "Agregar al carrito" }));

  await waitFor(() => {
    expect(refresh).toHaveBeenCalledTimes(1);
  });
  expect(screen.queryByRole("alert")).toBeNull();
});

it("disables the button while add is in flight", async () => {
  let resolveAdd!: (value: { ok: true; itemCount: number }) => void;
  addToCart.mockReturnValue(
    new Promise((resolve) => {
      resolveAdd = resolve;
    }),
  );
  render(<AddToCartButton productId="coffee-1" />);

  fireEvent.click(screen.getByRole("button", { name: "Agregar al carrito" }));

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Agregar al carrito" })).toBeDisabled();
  });

  resolveAdd({ ok: true, itemCount: 1 });

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Agregar al carrito" })).toBeEnabled();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
