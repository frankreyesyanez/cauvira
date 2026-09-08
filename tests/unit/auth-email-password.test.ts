import { expect, it } from "vitest";
import { emailAndPassword } from "@/lib/auth-email-password";

it("keeps email/password sign-in and disables public sign-up", () => {
  expect(emailAndPassword).toEqual({
    enabled: true,
    disableSignUp: true,
  });
});
