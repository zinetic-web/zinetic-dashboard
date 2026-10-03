import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { activateTrialIfRequested } from "@/lib/studio/trial";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LuClock, LuCircleX, LuShieldAlert, LuMail } from "react-icons/lu";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("status, role, blocked_reason")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") redirect("/admin");
  if (profile?.status === "approved") redirect("/dashboard");
  // A free-trial sign-up whose email is confirmed is approved here, whichever link they used to get in.
  // Ordinary accounts have no trial sign-up on record and are left waiting for an admin.
  if (profile?.status === "pending" && (await activateTrialIfRequested(user.id))) redirect("/studio");

  const isRejected = profile?.status === "rejected";
  const isBlocked = profile?.status === "blocked";

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="flex items-center justify-between px-6 py-5">
        <Link href="/">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="flex flex-col items-center gap-4">
            <div
              className={
                isRejected || isBlocked
                  ? "flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive"
                  : "flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary"
              }
            >
              {isBlocked ? (
                <LuShieldAlert className="size-8" />
              ) : isRejected ? (
                <LuCircleX className="size-8" />
              ) : (
                <LuClock className="size-8" />
              )}
            </div>
            <div className="flex flex-col items-center gap-2">
              <CardTitle className="text-2xl">
                {isBlocked
                  ? "Account blocked"
                  : isRejected
                    ? "Registration rejected"
                    : "Awaiting approval"}
              </CardTitle>
              <Badge variant={isRejected || isBlocked ? "destructive" : "secondary"}>
                {isBlocked ? "Blocked" : isRejected ? "Rejected" : "Pending review"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-5">
            <p className="text-[0.925rem] leading-relaxed text-muted-foreground">
              {isBlocked
                ? "This account has been permanently blocked for violating our Terms of Service. This decision is final and cannot be reversed by signing in again. If you believe this is a mistake, contact support."
                : isRejected
                  ? "An admin has rejected this registration. If you think this is a mistake, please contact support."
                  : "Your account has been created and is waiting for an admin to review and approve it. You'll be able to sign in as soon as it's approved."}
            </p>
            <a
              href="mailto:support@zineticmusic.com"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-4"
            >
              <LuMail className="size-4 shrink-0" />
              <span>Contact support</span>
            </a>
            <form action={signOut} className="w-full">
              <Button type="submit" variant="outline" className="w-full">
                Sign out
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
