export type SeedGuardInput = {
  allowSeed: string | undefined;
  databaseUrl: string;
  testDatabaseUrl: string;
  seedEnv: Record<string, string | undefined>;
};

const requiredSeedKeys = [
  "SEED_ADMIN_EMAIL",
  "SEED_ADMIN_PASSWORD",
  "SEED_CATALOG_MANAGER_EMAIL",
  "SEED_CATALOG_MANAGER_PASSWORD",
  "SEED_SALES_EMAIL",
  "SEED_SALES_PASSWORD",
] as const;

const builtInDefaultPasswords = new Set([
  "CauviraAdmin!test1",
  "CauviraCatalog!test1",
  "CauviraSales!test1",
]);

function missingSeedKeys(seedEnv: SeedGuardInput["seedEnv"]) {
  return requiredSeedKeys.filter((key) => !seedEnv[key]?.trim());
}

function usesBuiltInDefaultPassword(seedEnv: SeedGuardInput["seedEnv"]) {
  return [
    seedEnv.SEED_ADMIN_PASSWORD,
    seedEnv.SEED_CATALOG_MANAGER_PASSWORD,
    seedEnv.SEED_SALES_PASSWORD,
  ].some((password) => password !== undefined && builtInDefaultPasswords.has(password));
}

export function assertSeedAllowed({
  allowSeed,
  databaseUrl,
  testDatabaseUrl,
  seedEnv,
}: SeedGuardInput) {
  if (allowSeed !== "true") {
    throw new Error("Refusing to seed: set ALLOW_SEED=true to run db:seed.");
  }

  if (databaseUrl === testDatabaseUrl) {
    return;
  }

  const missing = missingSeedKeys(seedEnv);
  if (missing.length > 0) {
    throw new Error(
      `Refusing to seed a non-test database without explicit ${missing.join(", ")}.`,
    );
  }

  if (usesBuiltInDefaultPassword(seedEnv)) {
    throw new Error(
      "Refusing to seed a non-test database with a built-in default password.",
    );
  }
}
