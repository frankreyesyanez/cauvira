import type { Role } from "@/db/schema/auth";

export type SeedUser = {
  email: string;
  password: string;
  name: string;
  role: Role;
};

function envOrDefault(key: string, fallback: string) {
  const value = process.env[key]?.trim();
  return value ? value : fallback;
}

export function getSeedUsers(): SeedUser[] {
  return [
    {
      email: envOrDefault("SEED_ADMIN_EMAIL", "admin@cauvira.test"),
      password: envOrDefault("SEED_ADMIN_PASSWORD", "CauviraAdmin!test1"),
      name: "Administración Cauvira",
      role: "administrator",
    },
    {
      email: envOrDefault("SEED_CATALOG_MANAGER_EMAIL", "catalogo@cauvira.test"),
      password: envOrDefault(
        "SEED_CATALOG_MANAGER_PASSWORD",
        "CauviraCatalog!test1",
      ),
      name: "Gestión de catálogo",
      role: "catalog_manager",
    },
    {
      email: envOrDefault("SEED_SALES_EMAIL", "ventas@cauvira.test"),
      password: envOrDefault("SEED_SALES_PASSWORD", "CauviraSales!test1"),
      name: "Equipo comercial",
      role: "sales",
    },
  ];
}

export function getSeedUser(role: SeedUser["role"]) {
  const user = getSeedUsers().find((candidate) => candidate.role === role);
  if (!user) {
    throw new Error(`Missing seed user for role ${role}`);
  }
  return user;
}
