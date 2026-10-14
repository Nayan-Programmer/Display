import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SignupInput = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  code: z.string().trim().min(1).max(64),
});

/**
 * Creates an administrator account WITHOUT sending a confirmation email.
 * Instead of an emailed code, everyone enters the same fixed registration code.
 * The code is checked here on the server (never in the browser). Any email can
 * register with the code, but only emails listed in public.admin_emails can
 * actually manage the display (enforced by row-level security).
 *
 * To change the code later, set ADMIN_SIGNUP_CODE in the server environment.
 */
const DEFAULT_SIGNUP_CODE = "AG7935";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const createAdminAccount = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SignupInput.parse(input))
  .handler(async ({ data }) => {
    const expected = (process.env["ADMIN_SIGNUP_CODE"] || DEFAULT_SIGNUP_CODE).trim();
    if (!timingSafeEqual(data.code.toUpperCase(), expected.toUpperCase())) {
      throw new Error("Incorrect registration code.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true, // skip the "check your Gmail" step
    });
    if (error) {
      if (/already|registered|exists/i.test(error.message)) {
        throw new Error("An account with this email already exists. Please sign in.");
      }
      throw new Error(error.message);
    }
    return { ok: true as const };
  });
