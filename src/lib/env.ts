import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url().refine((value) => value.startsWith("postgres"), "DATABASE_URL must use PostgreSQL"),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
});

export type AppEnv = z.infer<typeof envSchema>;
export const parseEnv = (input: NodeJS.ProcessEnv | Record<string, string>) => envSchema.parse(input);
export const env = parseEnv(process.env);
