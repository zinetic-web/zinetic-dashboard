"use client";

import * as React from "react";
import { serifFont } from "@/components/landing/fonts";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LuChevronDown,
  LuZap,
  LuFolderOpen,
  LuHouse,
  LuLifeBuoy,
  LuLogOut,
  LuMenu,
  LuPanelLeftClose,
  LuPanelLeftOpen,
  LuSearch,
  LuLock,
  LuReceipt,
  LuUserRoundX,
  LuX,
} from "react-icons/lu";
import { signOut } from "@/app/actions/auth";
import { stopImpersonating } from "@/app/actions/admin";
import { cn } from "@/lib/utils";
import { GROUPS, TOOLS, type StudioTool } from "@/lib/studio/tools";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/* ------------------------------------------------ remembered on/off choices */

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
};
const read = (key: string) => {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

/** A true/false choice kept in this browser, so the sidebar stays how the customer left it. */
function useFlag(key: string) {
  const value = React.useSyncExternalStore(subscribe, () => read(key), () => false);
  const set = React.useCallback(
    (next: boolean) => {
      try {
        localStorage.setItem(key, next ? "1" : "0");
      } catch {}
      listeners.forEach((l) => l());
    },
    [key]
  );
  return [value, set] as const;
}

/* ----------------------------------------------------------------- sidebar */

type ItemProps = {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  collapsed: boolean;
  onNavigate: () => void;
  /** the menu stays open, this only marks that the customer has not bought it */
  locked?: boolean;
};

function Item({ href, label, icon, active, collapsed, onNavigate, locked }: ItemProps) {
  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      aria-label={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-10 items-center gap-3 rounded-lg text-[0.9375rem] transition-colors [&_svg]:size-5 [&_svg]:shrink-0",
        collapsed ? "mx-auto w-11 justify-center" : "px-3",
        active ? "bg-gradient-to-r from-violet-600/30 to-blue-600/10 font-medium text-white ring-1 ring-violet-400/25" : "text-white/60 hover:bg-white/[0.05] hover:text-white"
      )}
    >
      {active && !collapsed && <span aria-hidden className="zs-grad-bg absolute top-1/2 -left-3 h-6 w-[3px] -translate-y-1/2 rounded-r-full" />}
      <span className={cn("transition-colors", active ? "text-violet-300" : "text-white/45 group-hover:text-white/85")}>{icon}</span>
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
      {!collapsed && locked && <LuLock className="!size-3.5 text-white/35" />}
      {collapsed && locked && <LuLock className="absolute right-1 bottom-1 !size-3 text-white/45" />}
    </Link>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">{locked ? `${label} (locked)` : label}</TooltipContent>
    </Tooltip>
  );
}

function SoonItem({ tool, collapsed }: { tool: StudioTool; collapsed: boolean }) {
  const Icon = tool.icon;
  const row = (
    <div className={cn("flex h-10 items-center gap-3 text-[0.9375rem] text-white/30 [&_svg]:size-5", collapsed ? "mx-auto w-11 justify-center" : "px-3")}>
      <Icon />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{tool.name}</span>
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[0.65rem]">Soon</span>
        </>
      )}
    </div>
  );
  if (!collapsed) return row;
  return (
    <Tooltip>
      <TooltipTrigger render={row} />
      <TooltipContent side="right">{tool.name} (soon)</TooltipContent>
    </Tooltip>
  );
}

function Group({ id, label, tools, collapsed, query, pathname, onNavigate, open: openTools }: { id: string; label: string; tools: StudioTool[]; collapsed: boolean; query: string; pathname: string; onNavigate: () => void; open: Record<string, boolean> }) {
  const [closed, setClosed] = useFlag(`studio-group-${id}-closed`);
  if (tools.length === 0) return null;
  // while searching, every group with a match stays open
  const open = query ? true : !closed;

  return (
    <div className="flex flex-col gap-0.5">
      {collapsed ? (
        <div className="mx-auto my-1 h-px w-6 bg-white/10" />
      ) : (
        <button
          type="button"
          onClick={() => setClosed(!closed)}
          aria-expanded={open}
          className="flex h-8 cursor-pointer items-center gap-2 px-3 text-xs font-medium tracking-wide text-white/40 transition-colors hover:text-white/75"
        >
          <span className="flex-1 text-left">{label}</span>
          <span className="text-xs tabular-nums text-white/30">{tools.length}</span>
          <LuChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90")} />
        </button>
      )}
      {(collapsed || open) &&
        tools.map((t) => {
          const Icon = t.icon;
          return t.href ? (
            <Item key={t.id} href={t.href} label={t.name} icon={<Icon />} active={pathname === t.href} collapsed={collapsed} onNavigate={onNavigate} locked={openTools[t.id] === false} />
          ) : (
            <SoonItem key={t.id} tool={t} collapsed={collapsed} />
          );
        })}
    </div>
  );
}

type Me = { name: string; email: string; activePlans: number; impersonating: boolean };

function Sidebar({ collapsed, onToggle, onNavigate, mobile = false, open, me }: { collapsed: boolean; onToggle: () => void; onNavigate: () => void; mobile?: boolean; open: Record<string, boolean>; me: Me }) {
  const pathname = usePathname();
  const [query, setQuery] = React.useState("");
  const needle = query.trim().toLowerCase();
  const match = (t: StudioTool) => !needle || t.name.toLowerCase().includes(needle) || t.blurb.toLowerCase().includes(needle);
  const rail = collapsed && !mobile;

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-16 shrink-0 items-center", rail ? "justify-center" : "justify-between gap-2 px-4")}>
        <Link href="/studio" onClick={onNavigate} className="flex min-w-0 items-center gap-3">
          <Image src="/brand/logo.png" alt="Zinetic Music" width={899} height={1140} style={{ height: 32, width: "auto" }} />
          {!rail && (
            <span className="truncate font-heading text-lg font-semibold tracking-tight">
              Zinetic <span className="zs-grad-text">Studio</span>
            </span>
          )}
        </Link>
        {!rail && !mobile && (
          <button type="button" onClick={onToggle} aria-label="Collapse sidebar" title="Collapse sidebar (Ctrl+B)" className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.07] hover:text-white">
            <LuPanelLeftClose className="size-5" />
          </button>
        )}
      </div>
      {rail && (
        <div className="flex justify-center pb-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <button type="button" onClick={onToggle} aria-label="Expand sidebar" className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.07] hover:text-white" />
              }
            >
              <LuPanelLeftOpen className="size-5" />
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        </div>
      )}

      <div className={cn("flex-1 overflow-y-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", rail ? "px-2" : "px-3")}>
        {rail ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={onToggle}
                  aria-label="Search tools"
                  className="mx-auto mb-3 flex size-11 cursor-pointer items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
                />
              }
            >
              <LuSearch className="size-5" />
            </TooltipTrigger>
            <TooltipContent side="right">Search tools</TooltipContent>
          </Tooltip>
        ) : (
          <div className="relative mb-4">
            <LuSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tools"
              aria-label="Search tools"
              className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] pr-3 pl-9 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-violet-400/50"
            />
          </div>
        )}

        <nav className="flex flex-col gap-0.5">
          {!needle && (
            <>
              <Item href="/studio" label="Home" icon={<LuHouse />} active={pathname === "/studio"} collapsed={rail} onNavigate={onNavigate} />
              <Item href="/studio/library" label="Library" icon={<LuFolderOpen />} active={pathname === "/studio/library"} collapsed={rail} onNavigate={onNavigate} />
              <Item href="/studio/plans" label="My plans" icon={<LuReceipt />} active={pathname === "/studio/plans"} collapsed={rail} onNavigate={onNavigate} />
            </>
          )}
        </nav>

        <div className="mt-4 flex flex-col gap-3">
          {GROUPS.map((g) => (
            <Group key={g.id} id={g.id} label={g.label} tools={TOOLS.filter((t) => t.group === g.id && match(t))} collapsed={rail} query={needle} pathname={pathname} onNavigate={onNavigate} open={open} />
          ))}
          {needle && !TOOLS.some(match) && <p className="px-3 py-4 text-sm text-white/40">No tools match “{query}”.</p>}
        </div>
      </div>

      <div className={cn("flex shrink-0 flex-col gap-2 border-t border-white/[0.07] py-3", rail ? "px-2" : "px-3")}>
        <Item href="/dashboard/support" label="Support" icon={<LuLifeBuoy />} active={false} collapsed={rail} onNavigate={onNavigate} />
        <UserCard me={me} rail={rail} />
      </div>
    </div>
  );
}

/** Who is signed in, what they have, and the ways to upgrade or leave. */
function UserCard({ me, rail }: { me: Me; rail: boolean }) {
  const label = me.name || me.email;
  const out = (
    <form action={me.impersonating ? stopImpersonating : signOut}>
      <button
        type="submit"
        aria-label={me.impersonating ? "Stop impersonating" : "Sign out"}
        title={me.impersonating ? "Stop impersonating" : "Sign out"}
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-white/55 transition-colors hover:bg-white/10 hover:text-white"
      >
        {me.impersonating ? <LuUserRoundX className="size-[1.15rem]" /> : <LuLogOut className="size-[1.15rem]" />}
      </button>
    </form>
  );
  const avatar = <span className="zs-grad-bg flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">{label.slice(0, 1).toUpperCase()}</span>;

  if (rail) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger render={<span className="cursor-default" />}>{avatar}</TooltipTrigger>
          <TooltipContent side="right">
            {label} · {me.activePlans} active {me.activePlans === 1 ? "plan" : "plans"}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<Link href="/studio/plans" aria-label="Upgrade" className="zs-btn flex size-10 items-center justify-center rounded-xl" />}>
            <LuZap className="size-[1.15rem]" />
          </TooltipTrigger>
          <TooltipContent side="right">Upgrade</TooltipContent>
        </Tooltip>
        {out}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
      <div className="flex items-center gap-3">
        {avatar}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{label}</p>
          <p className="flex items-center gap-1.5 truncate text-xs text-white/50">
            <LuZap className={me.activePlans > 0 ? "size-3 text-amber-300" : "size-3 text-white/30"} />
            {me.activePlans} active {me.activePlans === 1 ? "plan" : "plans"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/studio/plans" className="zs-btn flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold">
          <LuZap className="size-4" /> Upgrade
        </Link>
        {out}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- top bar */

function TopBar({ activePlans }: { activePlans: number }) {
  const pathname = usePathname();
  const tool = TOOLS.find((t) => t.href === pathname);
  const title = pathname === "/studio" ? "Home" : pathname === "/studio/library" ? "Library" : (tool?.name ?? "AI Studio");
  return (
    <header className="sticky top-0 z-20 hidden h-16 items-center justify-between gap-4 border-b border-white/[0.07] bg-[#07070f]/70 px-8 backdrop-blur-xl lg:flex">
      <div className="flex items-center gap-2.5 text-sm">
        <span className="text-white/45">AI Studio</span>
        <span className="text-white/20">/</span>
        <span className="font-medium">{title}</span>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/studio/plans" className="flex h-10 items-center gap-2 rounded-xl bg-white/[0.05] px-4 text-sm ring-1 ring-white/10 transition-colors hover:bg-white/[0.09]">
          <LuZap className={activePlans > 0 ? "size-4 text-amber-300" : "size-4 text-white/35"} />
          <span className="font-semibold tabular-nums">{activePlans}</span>
          <span className="text-white/55">{activePlans === 1 ? "active plan" : "active plans"}</span>
        </Link>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------- shell */

export function StudioShell({
  children,
  userName,
  userEmail,
  open: openTools,
  activePlans,
  impersonating = false,
}: {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  /** which tools the customer can use right now (false = locked) */
  open: Record<string, boolean>;
  activePlans: number;
  impersonating?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [collapsed, setCollapsed] = useFlag("studio-sidebar-collapsed");
  const close = () => setOpen(false);
  const me: Me = { name: userName, email: userEmail, activePlans, impersonating };

  // Ctrl or Cmd + B collapses the sidebar, the same shortcut other editors use
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed(!read("studio-sidebar-collapsed"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCollapsed]);

  return (
    <div className={`zl zs dark ${serifFont.variable} min-h-screen text-white`}>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-white/[0.07] bg-[#090913]/85 backdrop-blur-xl transition-[width] duration-200 lg:block",
          collapsed ? "w-[4.5rem]" : "w-72"
        )}
      >
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} onNavigate={close} open={openTools} me={me} />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/10 bg-[#090913]/90 px-4 backdrop-blur lg:hidden">
        <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="flex size-9 cursor-pointer items-center justify-center rounded-lg hover:bg-white/10">
          <LuMenu className="size-5" />
        </button>
        <Link href="/studio" className="flex items-center gap-2">
          <Image src="/brand/logo.png" alt="" width={899} height={1140} style={{ height: 24, width: "auto" }} />
          <span className="font-heading text-sm font-semibold">AI Studio</span>
        </Link>
        <form action={impersonating ? stopImpersonating : signOut} className="ml-auto">
          <button type="submit" aria-label="Sign out" className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white">
            {impersonating ? <LuUserRoundX className="size-5" /> : <LuLogOut className="size-5" />}
          </button>
        </form>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Close menu" onClick={close} className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[88vw] border-r border-white/10 bg-[#090913]">
            <button type="button" aria-label="Close" onClick={close} className="absolute top-3.5 right-3 z-10 flex size-9 cursor-pointer items-center justify-center rounded-lg hover:bg-white/10">
              <LuX className="size-5" />
            </button>
            <Sidebar collapsed={false} onToggle={close} onNavigate={close} mobile open={openTools} me={me} />
          </div>
        </div>
      )}

      <main className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-[4.5rem]" : "lg:pl-72")}>
        <TopBar activePlans={activePlans} />
        {impersonating && (
          <p className="bg-amber-500/15 px-4 py-2 text-center text-xs text-amber-200">You are viewing this dashboard as a customer.</p>
        )}
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
