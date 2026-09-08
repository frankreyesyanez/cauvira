import { render } from "@testing-library/react";
import RootLayout, { metadata } from "@/app/layout";

vi.mock("next/font/google", () => ({
  Barlow_Condensed: () => ({ variable: "--font-barlow-condensed" }),
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}));

it("localizes the root document for Mexico", () => {
  expect(metadata.title).toBe("Cauvira");
  expect(metadata.description).toBe(
    "Comercio industrial en México. Equipa lo que sigue.",
  );

  render(
    <RootLayout params={Promise.resolve({})}>
      <div>contenido</div>
    </RootLayout>,
  );

  expect(document.documentElement).toHaveAttribute("lang", "es-MX");
  expect(document.documentElement).toHaveClass("--font-barlow-condensed");
});
