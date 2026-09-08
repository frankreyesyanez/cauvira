import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ProductMedia } from "@/components/catalog/product-media";

const twoImages = [
  { url: "https://cdn.example/cover.jpg" },
  { url: "https://cdn.example/detail.jpg" },
];

function mockVisualRect(element: Element, width = 200, left = 0) {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      x: left,
      y: 0,
      left,
      top: 0,
      right: left + width,
      bottom: 120,
      width,
      height: 120,
      toJSON() {
        return {};
      },
    }),
  });
}

function mediaVisual() {
  return screen.getByRole("img").parentElement as HTMLElement;
}

it("scrubs to the second photo when the pointer is in the right half", () => {
  render(<ProductMedia images={twoImages} title="Máquina de hielo" />);

  const visual = mediaVisual();
  mockVisualRect(visual);
  fireEvent.pointerMove(visual, { clientX: 150, pointerType: "mouse" });

  expect(screen.getByRole("img")).toHaveAttribute(
    "src",
    "https://cdn.example/detail.jpg",
  );
});

it("does not render gallery ticks for a single photo", () => {
  render(
    <ProductMedia
      images={[{ url: "https://cdn.example/cover.jpg" }]}
      title="Purificador compacto"
    />,
  );

  expect(screen.getByRole("img")).toHaveAttribute(
    "src",
    "https://cdn.example/cover.jpg",
  );
  expect(screen.queryByTestId("gallery-ticks")).toBeNull();
});

it("shows the Selección Cauvira placeholder when there are no images", () => {
  render(<ProductMedia images={[]} title="Casa modular" />);

  expect(screen.getByText("Selección Cauvira")).toBeVisible();
  expect(screen.getByText("CV")).toBeVisible();
  expect(screen.queryByRole("img")).toBeNull();
});

it("marks equal tick segments as hidden chrome for two or more photos", () => {
  render(<ProductMedia images={twoImages} title="Montacargas eléctrico" />);

  const ticks = screen.getByTestId("gallery-ticks");
  expect(ticks).toHaveAttribute("aria-hidden", "true");
  expect(ticks.children).toHaveLength(2);
});

it("resets to the cover photo when the pointer leaves", () => {
  render(<ProductMedia images={twoImages} title="Café de especialidad" />);

  const visual = mediaVisual();
  mockVisualRect(visual);
  fireEvent.pointerMove(visual, { clientX: 150, pointerType: "mouse" });
  expect(screen.getByRole("img")).toHaveAttribute(
    "src",
    "https://cdn.example/detail.jpg",
  );

  fireEvent.pointerLeave(visual);
  expect(screen.getByRole("img")).toHaveAttribute(
    "src",
    "https://cdn.example/cover.jpg",
  );
});

it("uses swipe instead of X-mapping when the pointer is not a mouse", () => {
  render(<ProductMedia images={twoImages} title="Cancha de pádel" />);

  const visual = mediaVisual();
  mockVisualRect(visual);
  fireEvent.pointerMove(visual, { clientX: 150, pointerType: "touch" });
  expect(screen.getByRole("img")).toHaveAttribute(
    "src",
    "https://cdn.example/cover.jpg",
  );

  fireEvent.pointerDown(visual, { clientX: 160, pointerType: "touch" });
  fireEvent.pointerUp(visual, { clientX: 140, pointerType: "touch" });
  expect(screen.getByRole("img")).toHaveAttribute(
    "src",
    "https://cdn.example/cover.jpg",
  );

  fireEvent.pointerDown(visual, { clientX: 160, pointerType: "touch" });
  fireEvent.pointerUp(visual, { clientX: 120, pointerType: "touch" });
  expect(screen.getByRole("img")).toHaveAttribute(
    "src",
    "https://cdn.example/detail.jpg",
  );
});

it("stops a completed swipe from activating the wrapping card link", () => {
  const onClick = vi.fn();
  render(
    <a href="/productos/hielo" onClick={onClick}>
      <ProductMedia images={twoImages} title="Máquina de hielo" />
    </a>,
  );

  const visual = mediaVisual();
  mockVisualRect(visual);
  fireEvent.pointerDown(visual, { clientX: 160, pointerType: "touch" });
  fireEvent.pointerUp(visual, { clientX: 120, pointerType: "touch" });
  fireEvent.click(visual);

  expect(onClick).not.toHaveBeenCalled();
});
