import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import {
  ForbiddenError,
  requireRole,
  UnauthorizedError,
} from "@/features/auth/require-role";

export const catalogMutationRoles = [
  "administrator",
  "catalog_manager",
] as const;

export async function requireCatalogMutationAccess() {
  try {
    return await requireRole(await headers(), catalogMutationRoles);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return redirect("/ingresar");
    }
    if (error instanceof ForbiddenError) {
      return forbidden();
    }
    throw error;
  }
}
