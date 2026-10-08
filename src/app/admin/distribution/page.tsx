import Link from "next/link";
import { LuDisc3 } from "react-icons/lu";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DistributionPage() {
  const { count } = await createAdminClient().from("user_products").select("user_id", { count: "exact", head: true }).eq("product", "distribution");
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Music Distribution</h1>
        <p className="mt-1 text-sm text-muted-foreground">Releases, royalties and analytics for artists and labels.</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg border bg-muted/40">
              <LuDisc3 className="size-5 text-muted-foreground" />
            </span>
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                Dashboard in progress <Badge variant="outline">Building</Badge>
              </CardTitle>
              <CardDescription>It will have its own address, sign-in and admin tools, just like the Checker and AI Studio.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <ul className="flex flex-col gap-2 text-muted-foreground">
            <li>Plans are on the website but cannot be bought yet. Buying is blocked on the server until this opens.</li>
            <li>{count ?? 0} customer{count === 1 ? " has" : "s have"} early access switched on.</li>
            <li>When the dashboard is ready, its releases, royalties and artists will be managed from this section.</li>
          </ul>
          <div>
            <Button variant="outline" nativeButton={false} render={<Link href="/admin/customers" />}>
              Give someone early access
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
