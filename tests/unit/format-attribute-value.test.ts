import { expect, it } from "vitest";
import { formatAttributeValue } from "@/components/catalog/format-attribute-value";

it("formats measurement attributes with units", () => {
  expect(formatAttributeValue({ value: 500, unit: "kg/día" }, "kg/día")).toBe(
    "500 kg/día",
  );
});

it("formats boolean attributes in Spanish", () => {
  expect(formatAttributeValue(true, null)).toBe("Sí");
});
