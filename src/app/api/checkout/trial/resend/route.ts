import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Sends the confirmation email again.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; service?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const studio = (process.env.NEXT_PUBLIC_STUDIO_URL ?? "").replace(/\/$/, "");
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${studio}/auth/confirm?next=${encodeURIComponent("/studio?trial=1")}` } });
  if (error) return NextResponse.json({ error: error.message.includes("rate") ? "Please wait a minute before asking for another email." : error.message }, { status: 429 });
  return NextResponse.json({ ok: true });
}
