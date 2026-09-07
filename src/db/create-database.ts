import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export const createDatabase = (url: string) => {
  const client = postgres(url, { max: 1, prepare: false });
  return drizzle(client);
};
