import { expect, it } from "vitest";
import { formatMxn } from "@/lib/money";

it("formats integer minor units without floating point math", () => {
  expect(formatMxn(4_890_000)).toMatch(/\$48,900/);
});
