import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AddToCartButton } from "@/components/catalog/add-to-cart-button";

vi.mock("@/features/cart/cart.mutations", () => ({
  addToCartAction: vi.fn(),
}));

it("submits productId with the Agregar al carrito label when there are no options", () => {
  render(<AddToCartButton productId="coffee-1" />);

  expect(screen.getByRole("button", { name: "Agregar al carrito" })).toBeVisible();

  const productId = document.querySelector('input[name="productId"]');
  expect(productId).toHaveAttribute("type", "hidden");
  expect(productId).toHaveValue("coffee-1");
  expect(document.querySelectorAll('input[name="choiceId"]')).toHaveLength(0);
});
