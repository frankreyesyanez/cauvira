import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { SearchForm } from "@/components/catalog/search-form";

it("submits catalog search to the product listing route", () => {
  render(<SearchForm defaultQuery="hielo" />);

  const form = screen.getByRole("search");
  expect(form).toHaveAttribute("action", "/productos");
  expect(form).toHaveAttribute("method", "get");
  expect(screen.getByRole("searchbox", { name: /buscar en cauvira/i })).toHaveValue(
    "hielo",
  );
});
