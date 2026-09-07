import { render, screen } from "@testing-library/react";
import HomePage from "@/app/(store)/page";

it("identifies Cauvira as a commerce experience", () => {
  render(<HomePage />);
  expect(screen.getByRole("heading", { name: /equipa lo que sigue/i })).toBeVisible();
  expect(screen.getByRole("search")).toBeVisible();
});
