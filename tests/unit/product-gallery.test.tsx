import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ProductGallery } from "@/components/catalog/product-gallery";

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

it("updates the detail gallery from thumbnail hover, click, and swipe", () => {
  render(<ProductGallery images={twoImages} title="Máquina de escamas" />);

  const stage = screen.getByRole("img", { name: "Máquina de escamas" });
  expect(stage).toHaveAttribute("src", "https://cdn.example/cover.jpg");

  const thumbs = screen.getAllByRole("button");
  expect(thumbs).toHaveLength(2);

  fireEvent.mouseEnter(thumbs[1]!);
  expect(screen.getByRole("img", { name: "Máquina de escamas" })).toHaveAttribute(
    "src",
    "https://cdn.example/detail.jpg",
  );

  fireEvent.click(thumbs[0]!);
  expect(screen.getByRole("img", { name: "Máquina de escamas" })).toHaveAttribute(
    "src",
    "https://cdn.example/cover.jpg",
  );

  mockVisualRect(stage);
  fireEvent.pointerDown(stage, { clientX: 180, pointerType: "touch" });
  fireEvent.pointerUp(stage, { clientX: 140, pointerType: "touch" });
  expect(screen.getByRole("img", { name: "Máquina de escamas" })).toHaveAttribute(
    "src",
    "https://cdn.example/detail.jpg",
  );
});

it("shows the detail placeholder when the gallery has no images", () => {
  render(<ProductGallery images={[]} title="Casa modular" />);

  expect(screen.getByText("Selección Cauvira")).toBeVisible();
  expect(screen.getByText("CV")).toBeVisible();
  expect(screen.queryByRole("img")).toBeNull();
  expect(screen.queryAllByRole("button")).toHaveLength(0);
});
