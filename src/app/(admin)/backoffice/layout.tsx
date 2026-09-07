import { roles } from "@/db/schema/auth";
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
  try {
    await requireRole(await headers(), roles);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return redirect("/ingresar");
    }

    throw error;
  }

  return <>{children}</>;
}
