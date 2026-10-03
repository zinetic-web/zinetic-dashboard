import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Ends a session that no longer belongs to a real account, such as one whose customer was deleted.
// Without this the browser keeps a valid token, the login page sends it back to the dashboard, and
// the dashboard sends it back to the login page, for ever.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${request.nextUrl.origin}/login`);
}
