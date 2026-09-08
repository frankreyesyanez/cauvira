import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ProductForm } from "@/components/catalog/product-form";

const categories = [
  {
    id: "3d03a1c7-7ca0-44e0-8fcb-1ec03f5d48d0",
    name: "Máquinas de hielo",
    attributes: [
      {
        id: "output",
        key: "daily_output",
        label: "Producción diaria",
        type: "measurement" as const,
        required: true,
        unit: "kg/día",
        options: [],
      },
    ],
  },
  {
    id: "5ed56882-93d3-4513-8b71-52aa08f5460f",
    name: "Café",
    attributes: [
      {
        id: "origin",
        key: "origin",
        label: "Origen",
        type: "text" as const,
        required: false,
        unit: null,
        options: [],
      },
    ],
  },
];

it("renders category-defined fields", () => {
  render(<ProductForm action={vi.fn()} categories={categories} />);

  expect(screen.getByLabelText(/producción diaria/i)).toBeVisible();
  expect(screen.getByText("kg/día")).toBeVisible();
});

it("switches dynamic fields while preserving shared product fields", () => {
  render(<ProductForm action={vi.fn()} categories={categories} />);

  fireEvent.change(screen.getByLabelText(/nombre del producto/i), {
    target: { value: "Máquina industrial" },
  });
  fireEvent.change(screen.getByLabelText(/^categoría$/i), {
    target: { value: categories[1].id },
  });

  expect(screen.getByLabelText(/nombre del producto/i)).toHaveValue(
    "Máquina industrial",
  );
  expect(screen.getByLabelText(/origen/i)).toBeVisible();
  expect(screen.queryByLabelText(/producción diaria/i)).not.toBeInTheDocument();
});

it.each([
  ["direct_purchase", "Agregar al pedido"],
  ["quotation", "Solicitar cotización"],
  ["starting_price", "Ver precio desde"],
  ["assisted_contact", "Hablar con un asesor"],
])("previews the %s call to action", (mode, label) => {
  render(<ProductForm action={vi.fn()} categories={categories} />);

  fireEvent.change(screen.getByLabelText(/modalidad de compra/i), {
    target: { value: mode },
  });

  expect(screen.getByText(label)).toBeVisible();
});
