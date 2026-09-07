import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const { getHeaders, redirect, requireRole } = vi.hoisted(() => ({
  getHeaders: vi.fn(),
  redirect: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: getHeaders }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/features/auth/require-role", () => ({
  requireRole,
  UnauthorizedError: class UnauthorizedError extends Error {},
}));

import BackofficeLayout from "@/app/(admin)/backoffice/layout";

const requestHeaders = new Headers({ cookie: "session=token" });

beforeEach(() => {
  getHeaders.mockReset().mockResolvedValue(requestHeaders);
  redirect.mockReset();
  requireRole.mockReset();
});

it("checks every backoffice request against the staff roles", async () => {
  requireRole.mockResolvedValue({
    session: { id: "session-id" },
    user: { id: "user-id", role: "operations" },
  });

  const layout = await BackofficeLayout({
    children: <div>Backoffice content</div>,
  });
  render(layout);

  expect(requireRole).toHaveBeenCalledWith(requestHeaders, [
    "administrator",
    "sales",
    "catalog_manager",
    "operations",
  ]);
  expect(screen.getByText("Backoffice content")).toBeInTheDocument();
});

it("redirects unauthenticated visitors to sign in", async () => {
  const { UnauthorizedError } = await import("@/features/auth/require-role");
  requireRole.mockRejectedValue(new UnauthorizedError());

  await BackofficeLayout({
    children: <div>Backoffice content</div>,
  });

  expect(redirect).toHaveBeenCalledWith("/ingresar");
});

it("does not turn forbidden authorization failures into sign-in redirects", async () => {
  const forbidden = new Error("Forbidden");
  requireRole.mockRejectedValue(forbidden);

  await expect(
    BackofficeLayout({
      children: <div>Backoffice content</div>,
    }),
  ).rejects.toBe(forbidden);
  expect(redirect).not.toHaveBeenCalled();
});
