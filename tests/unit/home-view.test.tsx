import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { HomeView } from "@/components/catalog/home-view";

it("identifies Cauvira as a commerce experience", () => {
  render(<HomeView products={[]} categories={[]} />);
  expect(
    screen.getByRole("heading", { name: /equipa lo que sigue/i }),
  ).toBeVisible();
  expect(screen.getByRole("search")).toBeVisible();
});

it("shows an honest empty merchandising message without products", () => {
  render(<HomeView products={[]} categories={[]} />);
  expect(
    screen.getByRole("heading", { name: /sin productos publicados/i }),
  ).toBeVisible();
  expect(screen.getAllByText(/aún no hay productos publicados en el catálogo/i)).toHaveLength(2);
});
