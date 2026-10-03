import {
  LuAudioLines,
  LuClipboardList,
  LuDisc3,
  LuGauge,
  LuGift,
  LuHistory,
  LuLayoutDashboard,
  LuReceipt,
  LuServerCog,
  LuShieldCheck,
  LuUsers,
} from "react-icons/lu";

export type NavEntry = { href: string; label: string; icon: React.ReactNode; hint?: string; soon?: boolean };
export type NavSection = { id: string; label: string; entries: NavEntry[]; product?: "cms" | "studio" | "distribution" };

// One place that says what is in the admin panel. The sidebar and the command menu both read it.
export const ADMIN_NAV: NavSection[] = [
  {
    id: "manage",
    label: "Manage",
    entries: [
      { href: "/admin", label: "Overview", icon: <LuGauge />, hint: "Revenue, customers, what needs attention" },
      { href: "/admin/customers", label: "Customers", icon: <LuUsers />, hint: "Everyone, approvals, access, credits" },
      { href: "/admin/orders", label: "Orders and revenue", icon: <LuReceipt />, hint: "Every payment and plan purchase" },
      { href: "/admin/products", label: "Dashboards", icon: <LuLayoutDashboard />, hint: "Who can open which dashboard" },
    ],
  },
  {
    id: "cms",
    label: "Channel Checker",
    product: "cms",
    entries: [{ href: "/admin/checks", label: "Checks", icon: <LuShieldCheck />, hint: "Every channel check that was run" }],
  },
  {
    id: "studio",
    label: "AI Studio",
    product: "studio",
    entries: [
      { href: "/admin/studio", label: "Usage", icon: <LuAudioLines />, hint: "Runs, failures and what is used most" },
      { href: "/admin/studio/trial", label: "Free trial", icon: <LuGift />, hint: "The shared trial and what it costs" },
      { href: "/admin/engines", label: "Engines", icon: <LuServerCog />, hint: "Providers, models and limits" },
    ],
  },
  {
    id: "distribution",
    label: "Music Distribution",
    product: "distribution",
    entries: [{ href: "/admin/distribution", label: "Distribution", icon: <LuDisc3 />, soon: true }],
  },
  {
    id: "system",
    label: "System",
    entries: [{ href: "/admin/audit", label: "Audit log", icon: <LuHistory />, hint: "What admins have done" }],
  },
];

export const ALL_ENTRIES = ADMIN_NAV.flatMap((s) => s.entries.map((e) => ({ ...e, section: s.label })));

export const QUICK_ACTIONS: NavEntry[] = [
  { href: "/admin/customers?status=pending", label: "Review waiting sign-ups", icon: <LuClipboardList /> },
];
