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
  "direct_purchase",
  "quotation",
  "starting_price",
  "assisted_contact",
])("previews Agregar al carrito for %s", (mode) => {
  render(<ProductForm action={vi.fn()} categories={categories} />);

  fireEvent.change(screen.getByLabelText(/modalidad de compra/i), {
    target: { value: mode },
  });

  expect(screen.getByText("Agregar al carrito")).toBeVisible();
});

it("lets staff add a purchase option group with a priced value", () => {
  render(<ProductForm action={vi.fn()} categories={categories} />);
  fireEvent.click(screen.getByRole("button", { name: /agregar grupo de opciones/i }));
  fireEvent.change(screen.getByLabelText(/nombre del grupo/i), {
    target: { value: "Talla" },
  });
  fireEvent.change(screen.getByLabelText(/^etiqueta$/i), {
    target: { value: "M" },
  });
  fireEvent.change(screen.getByLabelText(/cargo \(mxn\)/i), {
    target: { value: "0" },
  });
  expect(screen.getByLabelText(/nombre del grupo/i)).toHaveValue("Talla");
});

it("requires public price for every purchase mode", () => {
  render(<ProductForm action={vi.fn()} categories={categories} />);
  fireEvent.change(screen.getByLabelText(/modalidad de compra/i), {
    target: { value: "quotation" },
  });
  expect(screen.getByLabelText(/precio público/i)).toBeRequired();
});

it("prefills editable product values and inherited attributes", () => {
  render(
    <ProductForm
      action={vi.fn()}
      categories={categories}
      initialProduct={{
        title: "Máquina existente",
        slug: "maquina-existente",
        categoryId: categories[0].id,
        purchaseMode: "starting_price",
        priceMinor: 12500050,
        summary: "Resumen existente del producto.",
        description: "Descripción existente.",
        published: true,
        attributes: {
          daily_output: { value: 500, unit: "kg/día" },
        },
      }}
    />,
  );

  expect(screen.getByLabelText(/nombre del producto/i)).toHaveValue(
    "Máquina existente",
  );
  expect(screen.getByLabelText(/precio público/i)).toHaveValue(125000.5);
  expect(screen.getByLabelText(/producción diaria/i)).toHaveValue(500);
  expect(screen.getByLabelText(/publicar al guardar/i)).toBeChecked();
});

it("links description and purchase-mode server errors accessibly", async () => {
  const action = vi.fn().mockResolvedValue({
    ok: false,
    fieldErrors: {
      description: ["La descripción no es válida."],
      purchaseMode: ["Selecciona una modalidad válida."],
    },
  });
  render(<ProductForm action={action} categories={categories} />);

  fireEvent.submit(screen.getByRole("button", { name: /guardar producto/i }).closest("form")!);

  expect(await screen.findByText("La descripción no es válida.")).toBeVisible();
  expect(screen.getByLabelText(/descripción completa/i)).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(screen.getByLabelText(/descripción completa/i)).toHaveAccessibleDescription(
    /explica beneficios.*la descripción no es válida/i,
  );
  expect(screen.getByLabelText(/modalidad de compra/i)).toHaveAccessibleDescription(
    /controla la acción.*selecciona una modalidad válida/i,
  );
});
