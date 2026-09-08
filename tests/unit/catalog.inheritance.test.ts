import { expect, it } from "vitest";
import { resolveCategoryAttributes } from "@/features/catalog/catalog.repository";

it("resolves two ancestor levels root-to-child and applies child overrides", () => {
  const categories = [
    { id: "root", parentId: null },
    { id: "middle", parentId: "root" },
    { id: "child", parentId: "middle" },
  ];
  const attribute = (
    id: string,
    categoryId: string,
    key: string,
    label: string,
  ) => ({
    id,
    categoryId,
    key,
    label,
    type: "text" as const,
    required: false,
    filterable: false,
    comparable: false,
    options: [],
    unit: null,
  });
  const attributes = [
    attribute("a-root", "root", "capacity", "Capacidad"),
    attribute("a-middle", "middle", "voltage", "Voltaje heredado"),
    attribute("a-child", "child", "voltage", "Voltaje nominal"),
    attribute("a-output", "child", "output", "Producción"),
  ];

  expect(
    resolveCategoryAttributes("child", categories, attributes).map(
      ({ id, key }) => ({ id, key }),
    ),
  ).toEqual([
    { id: "a-root", key: "capacity" },
    { id: "a-child", key: "voltage" },
    { id: "a-output", key: "output" },
  ]);
});
