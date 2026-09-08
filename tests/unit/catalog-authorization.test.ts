import { beforeEach, expect, it, vi } from "vitest";

const { forbidden, getHeaders, redirect, requireRole } = vi.hoisted(() => ({
  forbidden: vi.fn(),
  getHeaders: vi.fn(),
  redirect: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: getHeaders }));
vi.mock("next/navigation", () => ({ forbidden, redirect }));
vi.mock("@/features/auth/require-role", () => ({
  requireRole,
  ForbiddenError: class ForbiddenError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {},
}));

import { requireCatalogMutationAccess } from "@/features/catalog/catalog.authorization";
import {
  ForbiddenError,
  UnauthorizedError,
} from "@/features/auth/require-role";

beforeEach(() => {
  getHeaders.mockResolvedValue(new Headers());
  forbidden.mockReset();
  redirect.mockReset();
  requireRole.mockReset();
});

it("uses the framework 403 interrupt for authenticated disallowed roles", async () => {
  requireRole.mockRejectedValue(new ForbiddenError());

  await requireCatalogMutationAccess();

  expect(forbidden).toHaveBeenCalledOnce();
  expect(redirect).not.toHaveBeenCalled();
});

it("redirects unauthenticated users to sign in", async () => {
  requireRole.mockRejectedValue(new UnauthorizedError());

  await requireCatalogMutationAccess();

  expect(redirect).toHaveBeenCalledWith("/ingresar");
  expect(forbidden).not.toHaveBeenCalled();
});
