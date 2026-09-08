import { expect, it } from "vitest";
import { getListingEmptyMessage } from "@/components/catalog/listing-empty-message";

it("uses the exact search empty copy when a query is present", () => {
  expect(getListingEmptyMessage("hielo")).toBe(
    'No encontramos resultados para “hielo”. Solicita una solución y la buscaremos por ti.',
  );
});

it("uses a catalog empty variant when no query is present", () => {
  expect(getListingEmptyMessage()).toBe(
    "No encontramos productos publicados. Solicita una solución y la buscaremos por ti.",
  );
});
