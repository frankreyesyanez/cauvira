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
