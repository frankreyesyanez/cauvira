import { roles } from "@/db/schema/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import {
  requireRole,
  UnauthorizedError,
} from "@/features/auth/require-role";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

type BackofficeLayoutProps = {
  children: ReactNode;
};

export default async function BackofficeLayout({
  children,
}: BackofficeLayoutProps) {
  let canManageCatalog = false;
  try {
    const session = await requireRole(await headers(), roles);
    canManageCatalog =
      session.user.role === "administrator" ||
      session.user.role === "catalog_manager";
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return redirect("/ingresar");
    }

    throw error;
  }

  return (
    <div className="admin-shell">
      <AdminSidebar canManageCatalog={canManageCatalog} />
      <div className="admin-shell__content">{children}</div>
    </div>
  );
}
