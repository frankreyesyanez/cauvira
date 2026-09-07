import { env } from "@/lib/env";
import { createDatabase } from "./create-database";

export { createDatabase } from "./create-database";
export const db = createDatabase(env.DATABASE_URL);
