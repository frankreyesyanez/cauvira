import type { Role } from "@/db/schema/auth";
import { auth } from "@/lib/auth";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  readonly status = 403;

  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}

export const assertAllowedRole = (role: Role, allowedRoles: readonly Role[]) => {
  if (!allowedRoles.includes(role)) {
    throw new ForbiddenError();
  }
};

export const requireRole = async (
  headers: Headers,
  allowedRoles: readonly Role[],
) => {
  const session = await auth.api.getSession({ headers });

  if (!session) {
    throw new UnauthorizedError();
  }

  assertAllowedRole(session.user.role as Role, allowedRoles);
  return session;
};
