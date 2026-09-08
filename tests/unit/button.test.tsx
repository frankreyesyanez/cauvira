import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("does not use color as the only loading signal", () => {
    render(<Button loading>Guardar producto</Button>);

    const button = screen.getByRole("button", {
      name: /guardando producto/i,
    });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("preserves text from nested elements and fragments while loading", () => {
    render(
      <Button loading>
        <>
          <span>Guardar</span> <strong>cotización</strong>
        </>
      </Button>,
    );

    expect(
      screen.getByRole("button", { name: "Guardando cotización" }),
    ).toBeDisabled();
  });

  it("uses a supplied accessible label as the loading name source", () => {
    render(
      <Button aria-label="Guardar cambios del producto" loading>
        <span aria-hidden="true">+</span>
      </Button>,
    );

    expect(
      screen.getByRole("button", {
        name: "Guardando cambios del producto",
      }),
    ).toHaveAttribute("aria-busy", "true");
  });

  it("accepts an explicit loading label when child text cannot name the action", () => {
    render(
      <Button loading loadingLabel="Guardando ficha técnica">
        <svg aria-hidden="true" />
      </Button>,
    );

    expect(
      screen.getByRole("button", { name: "Guardando ficha técnica" }),
    ).toBeDisabled();
  });

  it.each(["primary", "secondary", "danger", "ghost"] as const)(
    "renders the %s variant as a native button",
    (variant) => {
      render(<Button variant={variant}>Continuar</Button>);

      expect(
        screen.getByRole("button", { name: "Continuar" }),
      ).toHaveAttribute("data-variant", variant);
    },
  );
});
