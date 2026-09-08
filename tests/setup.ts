import "@testing-library/jest-dom/vitest";

process.env.DATABASE_URL ??=
  "postgresql://postgres.project:secret@runtime.pooler.supabase.com:6543/postgres";
process.env.MIGRATION_DATABASE_URL ??=
  "postgresql://postgres:secret@db.project.supabase.co:5432/postgres";
process.env.TEST_DATABASE_URL ??=
  "postgresql://postgres:secret@test.pooler.supabase.com:6543/postgres";
process.env.BETTER_AUTH_SECRET ??= "x".repeat(32);
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY stay optional so CI/unit tests keep working.
