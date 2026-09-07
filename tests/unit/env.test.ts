import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

const validEnv = {
  DATABASE_URL:
    "postgresql://postgres.project:secret@runtime.pooler.supabase.com:6543/postgres",
  MIGRATION_DATABASE_URL:
    "postgresql://postgres:secret@db.project.supabase.co:5432/postgres",
  TEST_DATABASE_URL:
    "postgresql://postgres:secret@test.pooler.supabase.com:6543/postgres",
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
};

describe("parseEnv", () => {
  it("requires DATABASE_URL", () => {
    const input = { ...validEnv };
    delete input.DATABASE_URL;
    expect(() => parseEnv(input)).toThrow(/DATABASE_URL/);
  });

  it("requires MIGRATION_DATABASE_URL", () => {
    const input = { ...validEnv };
    delete input.MIGRATION_DATABASE_URL;
    expect(() => parseEnv(input)).toThrow(/MIGRATION_DATABASE_URL/);
  });

  it("requires TEST_DATABASE_URL", () => {
    const input = { ...validEnv };
    delete input.TEST_DATABASE_URL;
    expect(() => parseEnv(input)).toThrow(/TEST_DATABASE_URL/);
  });

  it("rejects an invalid DATABASE_URL", () => {
    expect(() =>
      parseEnv({
        ...validEnv,
        DATABASE_URL: "not-a-url",
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it("rejects a DATABASE_URL whose protocol only starts with postgres", () => {
    expect(() =>
      parseEnv({
        ...validEnv,
        DATABASE_URL: "postgres-evil://host",
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it("rejects an invalid MIGRATION_DATABASE_URL", () => {
    expect(() =>
      parseEnv({
        ...validEnv,
        MIGRATION_DATABASE_URL: "not-a-url",
      }),
    ).toThrow(/MIGRATION_DATABASE_URL/);
  });

  it("rejects a MIGRATION_DATABASE_URL whose protocol only starts with postgres", () => {
    expect(() =>
      parseEnv({
        ...validEnv,
        MIGRATION_DATABASE_URL: "postgres-evil://host",
      }),
    ).toThrow(/MIGRATION_DATABASE_URL/);
  });

  it("rejects an invalid TEST_DATABASE_URL", () => {
    expect(() =>
      parseEnv({
        ...validEnv,
        TEST_DATABASE_URL: "not-a-url",
      }),
    ).toThrow(/TEST_DATABASE_URL/);
  });

  it("rejects a TEST_DATABASE_URL whose protocol only starts with postgres", () => {
    expect(() =>
      parseEnv({
        ...validEnv,
        TEST_DATABASE_URL: "postgres-evil://host",
      }),
    ).toThrow(/TEST_DATABASE_URL/);
  });

  it("rejects a too-short BETTER_AUTH_SECRET", () => {
    expect(() =>
      parseEnv({
        ...validEnv,
        BETTER_AUTH_SECRET: "x".repeat(31),
      }),
    ).toThrow(/BETTER_AUTH_SECRET/);
  });

  it("rejects an invalid BETTER_AUTH_URL", () => {
    expect(() =>
      parseEnv({
        ...validEnv,
        BETTER_AUTH_URL: "not-a-url",
      }),
    ).toThrow(/BETTER_AUTH_URL/);
  });

  it("accepts the Supabase development environment", () => {
    expect(parseEnv(validEnv).BETTER_AUTH_URL).toBe("http://localhost:3000");
  });
});
