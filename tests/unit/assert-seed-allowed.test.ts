import { describe, expect, it } from "vitest";
import { assertSeedAllowed } from "@/db/assert-seed-allowed";

const testUrl =
  "postgresql://postgres:secret@test.pooler.supabase.com:6543/postgres";
const devUrl =
  "postgresql://postgres:secret@dev.pooler.supabase.com:6543/postgres";

const explicitSeedEnv = {
  SEED_ADMIN_EMAIL: "admin@cauvira.example",
  SEED_ADMIN_PASSWORD: "ExplicitAdmin!prod9",
  SEED_CATALOG_MANAGER_EMAIL: "catalogo@cauvira.example",
  SEED_CATALOG_MANAGER_PASSWORD: "ExplicitCatalog!prod9",
  SEED_SALES_EMAIL: "ventas@cauvira.example",
  SEED_SALES_PASSWORD: "ExplicitSales!prod9",
};

describe("assertSeedAllowed", () => {
  it("refuses to seed when ALLOW_SEED is missing", () => {
    expect(() =>
      assertSeedAllowed({
        allowSeed: undefined,
        databaseUrl: testUrl,
        testDatabaseUrl: testUrl,
        seedEnv: {},
      }),
    ).toThrow(/ALLOW_SEED/);
  });

  it("blocks built-in default passwords when DATABASE_URL is not the test URL", () => {
    expect(() =>
      assertSeedAllowed({
        allowSeed: "true",
        databaseUrl: devUrl,
        testDatabaseUrl: testUrl,
        seedEnv: {},
      }),
    ).toThrow(/SEED_/);
  });

  it("allows seed when ALLOW_SEED is true and DATABASE_URL is the test URL", () => {
    expect(() =>
      assertSeedAllowed({
        allowSeed: "true",
        databaseUrl: testUrl,
        testDatabaseUrl: testUrl,
        seedEnv: {},
      }),
    ).not.toThrow();
  });

  it("allows seed when ALLOW_SEED is true and explicit SEED_* are set on a non-test URL", () => {
    expect(() =>
      assertSeedAllowed({
        allowSeed: "true",
        databaseUrl: devUrl,
        testDatabaseUrl: testUrl,
        seedEnv: explicitSeedEnv,
      }),
    ).not.toThrow();
  });

  it("blocks built-in default passwords even when SEED_* are set on a non-test URL", () => {
    expect(() =>
      assertSeedAllowed({
        allowSeed: "true",
        databaseUrl: devUrl,
        testDatabaseUrl: testUrl,
        seedEnv: {
          SEED_ADMIN_EMAIL: "admin@cauvira.example",
          SEED_ADMIN_PASSWORD: "CauviraAdmin!test1",
          SEED_CATALOG_MANAGER_EMAIL: "catalogo@cauvira.example",
          SEED_CATALOG_MANAGER_PASSWORD: "CauviraCatalog!test1",
          SEED_SALES_EMAIL: "ventas@cauvira.example",
          SEED_SALES_PASSWORD: "CauviraSales!test1",
        },
      }),
    ).toThrow(/default password/i);
  });
});
