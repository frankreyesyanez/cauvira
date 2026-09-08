import { z } from "zod";

const postgresProtocols = new Set(["postgres:", "postgresql:"]);

const postgresUrl = z.string().superRefine((value, ctx) => {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    ctx.addIssue({
      code: "custom",
      message: "must be a valid URL",
    });
    return;
  }

  if (!postgresProtocols.has(parsed.protocol)) {
    ctx.addIssue({
      code: "custom",
      message: "must use PostgreSQL",
    });
  }
});

function emptyToUndefined(value: unknown) {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  return value;
}

const envSchema = z.object({
  DATABASE_URL: postgresUrl,
  MIGRATION_DATABASE_URL: postgresUrl,
  TEST_DATABASE_URL: postgresUrl,
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  SUPABASE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional(),
  ),
});

export type AppEnv = z.infer<typeof envSchema>;
export const parseEnv = (input: NodeJS.ProcessEnv | Record<string, string>) => envSchema.parse(input);
export const env = parseEnv(process.env);
