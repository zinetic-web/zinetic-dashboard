import Link from "next/link";
import { headers } from "next/headers";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthPanel } from "@/components/auth-panel";
import { AuthBrandProvider } from "@/components/auth-brand";
import { AUTH_BRANDS } from "@/components/brand-marks";
import { LuArrowLeft } from "react-icons/lu";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // the Channel Checker and AI Studio sign in at the same address, each on its own host
  let studioHost = "";
  try {
    studioHost = new URL(process.env.NEXT_PUBLIC_STUDIO_URL ?? "").hostname;
  } catch {}
  const studio = Boolean(studioHost) && ((await headers()).get("host") ?? "").split(":")[0] === studioHost;
  const key = studio ? "studio" : "cms";
  const brand = AUTH_BRANDS[key];

  return (
    <AuthBrandProvider brand={key}>
      <div className="grid min-h-screen md:grid-cols-2">
        <AuthPanel variant={key} className="hidden md:flex" />

        <div className="flex flex-col bg-background dark:bg-zinc-950">
          <header className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                aria-label="Back to home"
                className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <LuArrowLeft className="size-5" />
              </Link>
              <Link href={studio ? "/studio" : "/dashboard"} className="flex items-center gap-2.5">
                <brand.Mark size={36} />
                <span className="font-heading text-base font-semibold">{brand.name}</span>
              </Link>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex flex-1 items-center justify-center px-6 pb-20 sm:px-10">
            <div className="w-full max-w-md">{children}</div>
          </main>
        </div>
      </div>
    </AuthBrandProvider>
  );
}
