import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

const validEnv = {
  DATABASE_URL: "postgres://cauvira:cauvira@localhost:5432/cauvira",
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
};

describe("parseEnv", () => {
  it("rejects an invalid database URL", () => {
    expect(() =>
      parseEnv({
        ...validEnv,
        DATABASE_URL: "not-a-url",
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it("rejects a URL whose protocol only starts with postgres", () => {
    expect(() =>
      parseEnv({
        ...validEnv,
        DATABASE_URL: "postgres-evil://host",
      }),
    ).toThrow(/DATABASE_URL/);
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

  it("accepts the local development environment", () => {
    expect(parseEnv(validEnv).BETTER_AUTH_URL).toBe("http://localhost:3000");
  });
});
