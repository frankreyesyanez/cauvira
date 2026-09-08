import { describe, expect, it } from "vitest";
import { fingerprintChoiceIds, lineUnitMinor } from "@/features/catalog/pricing";

const groups = [
  {
    id: "g-volt",
    name: "Voltaje",
    required: true,
    sortOrder: 0,
    values: [
      { id: "v-220", label: "220 V", priceDeltaMinor: 0, sortOrder: 0 },
      { id: "v-440", label: "440 V", priceDeltaMinor: 850_000, sortOrder: 1 },
    ],
  },
  {
    id: "g-install",
    name: "Instalación",
    required: true,
    sortOrder: 1,
    values: [
      { id: "i-basic", label: "Básica", priceDeltaMinor: 0, sortOrder: 0 },
      { id: "i-full", label: "Completa", priceDeltaMinor: 1_250_000, sortOrder: 1 },
    ],
  },
  {
    id: "g-extra",
    name: "Garantía extendida",
    required: false,
    sortOrder: 2,
    values: [
      { id: "e-yes", label: "Sí", priceDeltaMinor: 500_000, sortOrder: 0 },
    ],
  },
];

describe("lineUnitMinor", () => {
  it("adds selected surcharges to the starting price", () => {
    const result = lineUnitMinor(18_990_000, groups, ["v-440", "i-full"]);
    expect(result).toEqual({ ok: true, unitMinor: 21_090_000 });
  });

  it("rejects a missing required group", () => {
    expect(lineUnitMinor(18_990_000, groups, ["v-220"]).ok).toBe(false);
  });

  it("rejects an unknown choice id", () => {
    expect(lineUnitMinor(18_990_000, groups, ["v-220", "i-basic", "nope"]).ok).toBe(
      false,
    );
  });

  it("rejects two values from the same group", () => {
    expect(
      lineUnitMinor(18_990_000, groups, ["v-220", "v-440", "i-basic"]).ok,
    ).toBe(false);
  });

  it("allows omitting an optional group", () => {
    const result = lineUnitMinor(18_990_000, groups, ["v-220", "i-basic"]);
    expect(result).toEqual({ ok: true, unitMinor: 18_990_000 });
  });
});

it("fingerprints choice ids in sorted order", () => {
  expect(fingerprintChoiceIds(["b", "a"])).toBe("a,b");
  expect(fingerprintChoiceIds([])).toBe("");
});
