import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CategoryForm } from "@/components/catalog/category-form";

it("prefills an editable category and its own attribute definitions", () => {
  render(
    <CategoryForm
      action={vi.fn()}
      categories={[
        { id: "root", name: "Maquinaria" },
        { id: "child", name: "Hielo" },
      ]}
      initialCategory={{
        id: "child",
        name: "Hielo",
        slug: "hielo",
        parentId: "root",
        attributes: [{
          id: "output",
          key: "daily_output",
          label: "Producción diaria",
          type: "measurement",
          required: true,
          filterable: true,
          comparable: true,
          unit: "kg/día",
          options: [],
        }],
      }}
    />,
  );

  expect(screen.getByLabelText(/^nombre$/i)).toHaveValue("Hielo");
  expect(screen.getByLabelText(/categoría superior/i)).toHaveValue("root");
  expect(screen.getByLabelText(/^clave$/i)).toHaveValue("daily_output");
  expect(screen.getByLabelText(/^unidad$/i)).toHaveValue("kg/día");
  expect(screen.getByLabelText(/^obligatorio$/i)).toBeChecked();
  expect(screen.queryByRole("option", { name: "Hielo" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /actualizar categoría/i })).toBeVisible();
});
