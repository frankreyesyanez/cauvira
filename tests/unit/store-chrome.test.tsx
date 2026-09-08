import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { StoreChrome } from "@/components/catalog/store-chrome";

it("exposes the bag count in the header link", () => {
  render(<StoreChrome bagCount={3} categories={[]} />);

  const bag = screen.getByRole("link", { name: "Bolsa, 3 artículos" });
  expect(bag).toHaveAttribute("href", "/bolsa");
  expect(screen.getByTestId("bag-count")).toHaveTextContent("Bolsa (3)");
});
