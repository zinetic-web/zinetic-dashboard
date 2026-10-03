import { redirect } from "next/navigation";
import { getDashboardSession } from "@/lib/supabase/dashboard-session";
import { getSessionProfile } from "@/lib/supabase/session";
import { getMyProducts } from "@/lib/products-server";
import { NoAccess } from "@/components/no-access";
import { StudioShell } from "@/components/studio/studio-shell";
import { accessByTool, entitlementRows, summarize } from "@/lib/studio/entitlements";
import { trialInfo } from "@/lib/studio/trial";

export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, isImpersonating } = await getDashboardSession();

  // a valid sign-in for an account that no longer exists would loop between here and /login
  const real = await getSessionProfile();
  if (real.user && !real.profile) redirect("/auth/signout");

  if (!user || !profile) redirect("/login");
  if (!isImpersonating && profile.role === "admin") redirect("/admin");
  if (profile.status !== "approved") redirect("/pending");
  const [products, rows, trial] = await Promise.all([getMyProducts(user.id), entitlementRows(user.id), trialInfo(user.id)]);
  const hasAccess = products.has("studio");
  const summary = summarize(rows);
  // every tool is open while the shared free trial is running
  const access = trial.active ? Object.fromEntries(Object.keys(accessByTool(summary)).map((k) => [k, true])) : accessByTool(summary);
  const activePlans = Object.values(summary).filter((x) => x.active).length + (trial.active ? 1 : 0);

  return (
    <StudioShell
      userName={profile.full_name ?? ""}
      userEmail={user.email ?? ""}
      open={access}
      activePlans={activePlans}
      impersonating={isImpersonating}
    >
      {hasAccess ? children : <NoAccess product="AI Studio" />}
    </StudioShell>
  );
}
