import Link from "next/link";
import { Suspense } from "react";
import { LuArrowRight } from "react-icons/lu";
import { getDashboardSession } from "@/lib/supabase/dashboard-session";
import { createClient } from "@/lib/supabase/server";
import { GROUPS, TOOLS } from "@/lib/studio/tools";
import { HomeHero } from "@/components/studio/home-hero";
import { RecentTile } from "@/components/studio/recent-tile";
import { cn } from "@/lib/utils";

// The latest things this customer made, streamed in after the rest of Home.
async function Recent({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("studio_generations")
    .select("id, kind, title, status, mime_type, created_at")
    .eq("user_id", userId)
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(4);
  const rows = data ?? [];
  if (rows.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <h2 className="font-heading text-xl font-semibold">Recent creations</h2>
        <Link href="/studio/library" className="flex items-center gap-1.5 text-sm text-white/55 transition-colors hover:text-white">
          View all <LuArrowRight className="size-4" />
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {rows.map((r) => (
          <li key={r.id}>
            <RecentTile id={r.id} video={Boolean(r.mime_type?.startsWith("video"))} createdAt={r.created_at} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function StudioHome() {
  const { user, profile } = await getDashboardSession();
  const first = (profile?.full_name ?? "").split(" ")[0];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12">
      <HomeHero name={first} />

      <Suspense fallback={null}>
        <Recent userId={user!.id} />
      </Suspense>

      {GROUPS.map((g) => (
        <section key={g.id} className="flex flex-col gap-4">
          <div>
            <h2 className="font-heading text-xl font-semibold">{g.label}</h2>
            <p className="mt-1 text-sm text-white/50">{g.blurb}</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.filter((t) => t.group === g.id).map((t) => {
              const Icon = t.icon;
              const body = (
                <>
                  <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg [&_svg]:size-5", t.accent)}>
                    <Icon />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{t.name}</span>
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-white/50">{t.blurb}</span>
                  </span>
                  {t.href ? <LuArrowRight className="size-4 shrink-0 text-white/30 transition-all group-hover:translate-x-0.5 group-hover:text-white" /> : <span className="rounded-full border border-white/10 px-2 py-0.5 text-[0.65rem] text-white/40">Soon</span>}
                </>
              );
              return (
                <li key={t.id}>
                  {t.href ? (
                    <Link href={t.href} className="group zs-card flex h-full items-center gap-4 p-4 transition-colors hover:border-violet-400/40 hover:bg-white/[0.05]">
                      {body}
                    </Link>
                  ) : (
                    <div className="zs-card flex h-full items-center gap-4 p-4 opacity-60">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
