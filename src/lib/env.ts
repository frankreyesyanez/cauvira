import { z } from "zod";

const postgresProtocols = new Set(["postgres:", "postgresql:"]);

const envSchema = z.object({
  DATABASE_URL: z.string().superRefine((value, ctx) => {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "DATABASE_URL must be a valid URL",
      });
      return;
    }

    if (!postgresProtocols.has(parsed.protocol)) {
      ctx.addIssue({
        code: "custom",
        message: "DATABASE_URL must use PostgreSQL",
      });
    }
  }),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
});

export type AppEnv = z.infer<typeof envSchema>;
export const parseEnv = (input: NodeJS.ProcessEnv | Record<string, string>) => envSchema.parse(input);
export const env = parseEnv(process.env);
