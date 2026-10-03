import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { activateTrialIfRequested } from "@/lib/studio/trial";

const TYPES: EmailOtpType[] = ["signup", "email", "magiclink"];

// Completes a link from an email and starts the session on this domain. It serves two things:
// the "confirm your email" link of a free-trial sign-up, and the one-time sign-in made after a
// verified payment. Then it sends the customer on to the page they were heading for.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const type = (searchParams.get("type") as EmailOtpType | null) ?? "magiclink";
  const next = searchParams.get("next") ?? "/";
  // only ever redirect to a path on this site
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const supabase = await createClient();
  let ok = false;
  if (tokenHash && TYPES.includes(type)) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }

  if (ok) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // a confirmed free-trial sign-up gets its account approved and its trial started
    if (user) await activateTrialIfRequested(user.id);
    return NextResponse.redirect(`${origin}${safeNext}`);
  }
  return NextResponse.redirect(`${origin}/login`);
}
