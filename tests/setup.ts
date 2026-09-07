import "@testing-library/jest-dom/vitest";

process.env.DATABASE_URL ??= "postgres://cauvira:cauvira@localhost:5432/cauvira";
process.env.BETTER_AUTH_SECRET ??= "x".repeat(32);
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
