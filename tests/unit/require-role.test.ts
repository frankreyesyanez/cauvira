import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: { getSession },
  },
}));

import {
  assertAllowedRole,
  ForbiddenError,
  requireRole,
  UnauthorizedError,
} from "@/features/auth/require-role";

const requestHeaders = new Headers({ cookie: "session=token" });
const catalogRoles = ["administrator", "catalog_manager"] as const;

describe("assertAllowedRole", () => {
  it.each(catalogRoles)("allows %s to administer the catalog", (role) => {
    expect(() => assertAllowedRole(role, catalogRoles)).not.toThrow();
  });

  it("rejects sales from catalog administration", () => {
    expect(() => assertAllowedRole("sales", catalogRoles)).toThrow(ForbiddenError);
    try {
      assertAllowedRole("sales", catalogRoles);
    } catch (error) {
      expect(error).toMatchObject({ status: 403 });
    }
  });
});

describe("requireRole", () => {
  beforeEach(() => {
    getSession.mockReset();
  });

  it("rejects a request without a session as unauthorized", async () => {
    getSession.mockResolvedValue(null);

    await expect(requireRole(requestHeaders, catalogRoles)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    expect(getSession).toHaveBeenCalledWith({ headers: requestHeaders });
  });

  it("rejects an authenticated user whose role is not allowed", async () => {
    getSession.mockResolvedValue({
      session: { id: "session-id" },
      user: { id: "user-id", role: "sales" },
    });

    await expect(requireRole(requestHeaders, catalogRoles)).rejects.toThrow(
      /forbidden/i,
    );
  });

  it("returns an allowed user's session", async () => {
    const session = {
      session: { id: "session-id" },
      user: { id: "user-id", role: "catalog_manager" },
    };
    getSession.mockResolvedValue(session);

    await expect(requireRole(requestHeaders, catalogRoles)).resolves.toBe(session);
  });
});
