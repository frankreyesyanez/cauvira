import { db } from "@/db";
import { account, roles, session, user, verification } from "@/db/schema/auth";
import { emailAndPassword } from "@/lib/auth-email-password";
import { env } from "@/lib/env";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { z } from "zod";

const authSchema = { user, session, account, verification };

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  emailAndPassword,
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "catalog_manager",
        input: false,
        validator: { output: z.enum(roles) },
      },
    },
  },
});
