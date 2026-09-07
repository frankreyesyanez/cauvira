import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

describe("parseEnv", () => {
  it("rejects an invalid database URL", () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: "not-a-url",
        BETTER_AUTH_SECRET: "x".repeat(32),
        BETTER_AUTH_URL: "http://localhost:3000",
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it("accepts the local development environment", () => {
    expect(
      parseEnv({
        DATABASE_URL: "postgres://cauvira:cauvira@localhost:5432/cauvira",
        BETTER_AUTH_SECRET: "x".repeat(32),
        BETTER_AUTH_URL: "http://localhost:3000",
      }).BETTER_AUTH_URL,
    ).toBe("http://localhost:3000");
  });
});
