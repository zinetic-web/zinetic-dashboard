import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signInLink } from "@/lib/checkout";
import { activateTrialIfRequested, getTrialConfig } from "@/lib/studio/trial";
import { studioService } from "@/lib/studio/services";
import { TOOLS } from "@/lib/studio/tools";

export const runtime = "nodejs";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/**
 * Free-trial sign-up. Until email sending is set up the account is approved and the trial started
 * on the spot, and the customer is signed in straight away. Set TRIAL_EMAIL_VERIFICATION=on to
 * require a confirmed email first: the account is then created unconfirmed, a link is emailed, and
 * the trial only starts when that link is opened (see app/auth/confirm).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { fullName?: string; email?: string; password?: string; service?: string; agreed?: boolean } | null;
  const fullName = body?.fullName?.trim() ?? "";
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  const service = body?.service ?? "";

  if (!fullName || !email || !password) return fail("Please fill in all fields.");
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid email address.");
  if (password.length < 8) return fail("Password must be at least 8 characters.");
  if (!body?.agreed) return fail("You must agree to the Terms, Privacy Policy and Refund Policy to continue.");
  if (!studioService(service)) return fail("The free trial is for AI Studio services.");
  if (!(await getTrialConfig()).enabled) return fail("Free trials are not open right now.");

  const tool = TOOLS.find((t) => t.id === studioService(service)?.tool);
  const studio = (process.env.NEXT_PUBLIC_STUDIO_URL ?? "").replace(/\/$/, "");
  const landing = `${tool?.href ?? "/studio"}?trial=1`;

  if (process.env.TRIAL_EMAIL_VERIFICATION !== "on") {
    const admin = createAdminClient();
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, trial_service: service },
    });
    if (!created.data?.user) {
      const exists = /already|registered|exists/i.test(created.error?.message ?? "");
      return fail(exists ? "An account with this email already exists. Log in to your account instead." : (created.error?.message ?? "Could not create your account."), exists ? 400 : 500);
    }
    if (!(await activateTrialIfRequested(created.data.user.id))) return fail("Your account was created, but the trial could not start. Please log in, or contact support.", 500);
    const url = await signInLink(email, studio, landing);
    return NextResponse.json({ ready: true, url: url ?? `${studio}/login` });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, trial_service: service }, emailRedirectTo: `${studio}/auth/confirm?next=${encodeURIComponent(landing)}` },
  });
  if (error) return fail(error.message.includes("rate") ? "Too many emails were sent just now. Please wait a few minutes and try again." : error.message);
  // Supabase answers a repeat sign-up with a user that has no identities, instead of an error
  if (data.user && (data.user.identities?.length ?? 0) === 0) return fail("An account with this email already exists. Log in to your account instead.");

  return NextResponse.json({ sent: true, email });
}
