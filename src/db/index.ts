import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";

export const createDatabase = (url: string) => {
  const client = postgres(url, { max: 1, prepare: false });
  return drizzle(client);
};

export const db = createDatabase(env.DATABASE_URL);
