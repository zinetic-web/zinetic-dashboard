"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LuArrowUpRight,
  LuBell,
  LuChevronDown,
  LuLogOut,
  LuMenu,
  LuPanelLeftClose,
  LuPanelLeftOpen,
  LuSearch,
  LuUserRoundX,
  LuX,
} from "react-icons/lu";
import { signOut } from "@/app/actions/auth";
import { stopImpersonating } from "@/app/actions/admin";
import { cn } from "@/lib/utils";
import { useFlag, readFlag } from "@/hooks/use-flag";
import { ThemeToggle } from "@/components/theme-toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ADMIN_NAV, ALL_ENTRIES, type NavEntry, type NavSection } from "@/components/admin-panel/nav";
import { CommandMenu } from "@/components/admin-panel/command-menu";

type Links = { cms?: string | null; studio?: string | null };

const matches = (pathname: string, href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/"));

// the most specific entry wins, so /admin/studio/trial does not also light up /admin/studio
const isActive = (pathname: string, href: string) => {
  if (!matches(pathname, href)) return false;
  return !ALL_ENTRIES.some((e) => e.href.length > href.length && matches(pathname, e.href));
};

function Entry({ entry, pathname, collapsed, onNavigate, badge }: { entry: NavEntry; pathname: string; collapsed: boolean; onNavigate: () => void; badge?: number }) {
  const active = isActive(pathname, entry.href);
  const inner = (
    <>
      <span className={cn("relative transition-colors [&_svg]:size-[1.1rem]", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}>
        {entry.icon}
        {collapsed && badge ? <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-500" /> : null}
      </span>
      {!collapsed && <span className="flex-1 truncate">{entry.label}</span>}
      {!collapsed && entry.soon && <span className="rounded-full border px-2 py-0.5 text-[0.65rem] text-muted-foreground">Soon</span>}
      {!collapsed && badge ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">{badge}</span> : null}
    </>
  );
  const cls = cn(
    "group relative flex h-10 items-center gap-3 rounded-lg text-sm transition-colors",
    collapsed ? "mx-auto w-11 justify-center" : "px-3",
    active ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
  );
  const link = (
    <Link href={entry.href} onClick={onNavigate} aria-current={active ? "page" : undefined} aria-label={collapsed ? entry.label : undefined} className={cls}>
      {active && !collapsed && <span aria-hidden className="absolute top-1/2 -left-3 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />}
      {inner}
    </Link>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">{entry.label}</TooltipContent>
    </Tooltip>
  );
}

function Section({ section, pathname, collapsed, onNavigate, pending, links }: { section: NavSection; pathname: string; collapsed: boolean; onNavigate: () => void; pending: number; links: Links }) {
  const [closed, setClosed] = useFlag(`admin-section-${section.id}-closed`);
  const open = !closed;
  const external = section.product === "cms" ? links.cms : section.product === "studio" ? links.studio : null;

  return (
    <div className="flex flex-col gap-0.5">
      {collapsed ? (
        <div className="mx-auto my-1 h-px w-6 bg-border" />
      ) : (
        <div className="flex h-8 items-center">
          <button
            type="button"
            onClick={() => setClosed(!closed)}
            aria-expanded={open}
            className="flex h-8 flex-1 cursor-pointer items-center gap-2 px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
          >
            <span className="flex-1 text-left">{section.label}</span>
            <LuChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90")} />
          </button>
          {external && (
            <a href={external} target="_blank" rel="noreferrer" aria-label={`Open ${section.label}`} title={`Open ${section.label}`} className="mr-1 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
              <LuArrowUpRight className="size-3.5" />
            </a>
          )}
        </div>
      )}
      {(collapsed || open) &&
        section.entries.map((e) => (
          <Entry key={e.href} entry={e} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} badge={e.href === "/admin/customers" ? pending : undefined} />
        ))}
    </div>
  );
}

function Sidebar({ collapsed, onToggle, onNavigate, pending, links, mobile = false }: { collapsed: boolean; onToggle: () => void; onNavigate: () => void; pending: number; links: Links; mobile?: boolean }) {
  const pathname = usePathname();
  const rail = collapsed && !mobile;
  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-16 shrink-0 items-center", rail ? "justify-center" : "px-5")}>
        <Link href="/admin" onClick={onNavigate} className="flex items-center gap-3">
          <Image src="/brand/logo.png" alt="" width={899} height={1140} style={{ height: 28, width: "auto" }} className="hidden dark:block" />
          <Image src="/brand/logo-black.png" alt="" width={899} height={1140} style={{ height: 28, width: "auto" }} className="block dark:hidden" />
          {!rail && (
            <span className="leading-tight">
              <span className="block font-heading text-[0.95rem] font-semibold">Zinetic</span>
              <span className="block text-xs text-muted-foreground">Admin</span>
            </span>
          )}
        </Link>
      </div>
      <div className={cn("flex flex-1 flex-col gap-4 overflow-y-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", rail ? "px-2" : "px-3")}>
        {ADMIN_NAV.map((s) => (
          <Section key={s.id} section={s} pathname={pathname} collapsed={rail} onNavigate={onNavigate} pending={pending} links={links} />
        ))}
      </div>
      {!mobile && (
        <div className={cn("shrink-0 border-t py-3", rail ? "px-2" : "px-3")}>
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn("flex h-10 cursor-pointer items-center gap-3 rounded-lg text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground [&_svg]:size-[1.1rem]", rail ? "mx-auto w-11 justify-center" : "w-full px-3")}
          >
            {collapsed ? <LuPanelLeftOpen /> : <LuPanelLeftClose />}
            {!rail && <span>Collapse</span>}
          </button>
        </div>
      )}
    </div>
  );
}

function TopBar({ adminName, adminEmail, pending, impersonating, onSearch }: { adminName: string; adminEmail: string; pending: number; impersonating: boolean; onSearch: () => void }) {
  const pathname = usePathname();
  const entry = ALL_ENTRIES.find((e) => isActive(pathname, e.href) && e.href !== "/admin") ?? ALL_ENTRIES[0];
  const detail = pathname.startsWith("/admin/customers/") ? "Customer" : null;
  const label = adminName || adminEmail;

  return (
    <header className="sticky top-0 z-20 hidden h-16 items-center gap-4 border-b bg-background/80 px-8 backdrop-blur-xl lg:flex">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="text-muted-foreground">{entry.section}</span>
        <span className="text-muted-foreground/50">/</span>
        <span className={cn("font-medium", detail && "text-muted-foreground")}>{entry.label}</span>
        {detail && (
          <>
            <span className="text-muted-foreground/50">/</span>
            <span className="font-medium">{detail}</span>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onSearch}
        className="mx-auto flex h-10 w-full max-w-md cursor-pointer items-center gap-3 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <LuSearch className="size-4" />
        <span className="flex-1 text-left">Search customers and pages</span>
        <kbd className="rounded border bg-background px-1.5 py-0.5 text-[0.65rem]">Ctrl K</kbd>
      </button>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Link href="/admin/customers?status=pending" aria-label="Waiting sign-ups" className="relative flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" />
            }
          >
            <LuBell className="size-5" />
            {pending > 0 && <span className="absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[0.6rem] font-semibold text-white">{pending}</span>}
          </TooltipTrigger>
          <TooltipContent>{pending > 0 ? `${pending} waiting for approval` : "Nothing waiting"}</TooltipContent>
        </Tooltip>
        <ThemeToggle />
        <form action={impersonating ? stopImpersonating : signOut} className="ml-2 flex items-center gap-2 rounded-full border bg-muted/40 py-1 pr-1 pl-1">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{label.slice(0, 1).toUpperCase()}</span>
          <span className="hidden max-w-36 truncate text-sm xl:block">{label}</span>
          <button type="submit" aria-label={impersonating ? "Stop impersonating" : "Sign out"} title={impersonating ? "Stop impersonating" : "Sign out"} className="flex size-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
            {impersonating ? <LuUserRoundX className="size-4" /> : <LuLogOut className="size-4" />}
          </button>
        </form>
      </div>
    </header>
  );
}

export function AdminShell({
  children,
  adminName,
  adminEmail,
  pending,
  links,
  impersonating = false,
}: {
  children: React.ReactNode;
  adminName: string;
  adminEmail: string;
  /** sign-ups waiting for approval */
  pending: number;
  links: Links;
  impersonating?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [collapsed, setCollapsed] = useFlag("admin-sidebar-collapsed");
  const close = () => setMobileOpen(false);

  // Ctrl or Cmd + K opens search, Ctrl or Cmd + B collapses the sidebar
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      } else if (k === "b") {
        e.preventDefault();
        setCollapsed(!readFlag("admin-sidebar-collapsed"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCollapsed]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className={cn("fixed inset-y-0 left-0 z-30 hidden border-r bg-card transition-[width] duration-200 lg:block", collapsed ? "w-[4.5rem]" : "w-72")}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} onNavigate={close} pending={pending} links={links} />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur lg:hidden">
        <button type="button" aria-label="Open menu" onClick={() => setMobileOpen(true)} className="flex size-9 cursor-pointer items-center justify-center rounded-lg hover:bg-accent">
          <LuMenu className="size-5" />
        </button>
        <Link href="/admin" className="font-heading text-sm font-semibold">
          Zinetic Admin
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" aria-label="Search" onClick={() => setSearchOpen(true)} className="flex size-9 cursor-pointer items-center justify-center rounded-lg hover:bg-accent">
            <LuSearch className="size-5" />
          </button>
          <ThemeToggle />
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Close menu" onClick={close} className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[88vw] border-r bg-card">
            <button type="button" aria-label="Close" onClick={close} className="absolute top-3.5 right-3 z-10 flex size-9 cursor-pointer items-center justify-center rounded-lg hover:bg-accent">
              <LuX className="size-5" />
            </button>
            <Sidebar collapsed={false} onToggle={close} onNavigate={close} pending={pending} links={links} mobile />
          </div>
        </div>
      )}

      <main className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-[4.5rem]" : "lg:pl-72")}>
        <TopBar adminName={adminName} adminEmail={adminEmail} pending={pending} impersonating={impersonating} onSearch={() => setSearchOpen(true)} />
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">{children}</div>
      </main>

      <CommandMenu open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
