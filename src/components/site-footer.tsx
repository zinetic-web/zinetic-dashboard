import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/logo";
import { ZButton } from "@/components/landing/button";
import { Reveal } from "@/components/landing/primitives";
import { LuMapPin, LuMail, LuPhone, LuBadgeCheck } from "react-icons/lu";

const SERVICES = [
  { label: "Music", href: "/services#music" },
  { label: "AI Voice & Audio", href: "/services#voice" },
  { label: "AI Video", href: "/services#video" },
  { label: "Creator Tools", href: "/services#creator-tools" },
  { label: "All services", href: "/services" },
  { label: "Pricing", href: "/#pricing" },
];

const COMPANY = [
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
];

const LEGAL = [
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Return & Refund Policy", href: "/refund-policy" },
];

function LinkColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-(--zl-muted)">{title}</h4>
      <ul className="mt-5 flex flex-col gap-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="group inline-flex items-center gap-2 text-sm text-(--zl-text)/85 transition-colors hover:text-(--zl-text)"
            >
              <span className="zl-grad-bg h-px w-0 transition-all duration-300 group-hover:w-3" />
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative z-10 isolate overflow-hidden border-t border-(--zl-line) bg-(--zl-bg)/80 px-5 pt-20 pb-8 backdrop-blur-sm sm:pt-28">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -bottom-40 left-1/2 h-[420px] w-[80vw] -translate-x-1/2 rounded-full bg-(--zl-glow-a) blur-[120px]" />
        <div className="absolute -top-20 right-0 h-[280px] w-[40vw] rounded-full bg-(--zl-glow-c) blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl">
        <Reveal className="flex flex-col items-start justify-between gap-8 border-b border-(--zl-line) pb-14 lg:flex-row lg:items-end">
          <h2 className="zl-display max-w-3xl text-[clamp(2.2rem,5vw,4.2rem)] font-semibold">
            Let&apos;s make something <span className="zl-serif zl-grad-text">people hear.</span>
          </h2>
          <div className="flex flex-wrap gap-3">
            <ZButton href="/checkout" size="lg">
              Start now
            </ZButton>
            <ZButton href="/contact" variant="outline" size="lg" arrow={false}>
              Contact us
            </ZButton>
          </div>
        </Reveal>

        <div className="grid gap-12 py-14 sm:grid-cols-2 lg:grid-cols-12">
          <div className="sm:col-span-2 lg:col-span-4">
            <Logo size={38} />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-(--zl-muted)">
              Music distribution, AI voice and AI video, and YouTube network checks, from one
              Bangladesh-based studio for artists, labels and creators.
            </p>
          </div>

          <div className="lg:col-span-2">
            <LinkColumn title="Services" links={SERVICES} />
          </div>
          <div className="lg:col-span-2">
            <LinkColumn title="Company" links={COMPANY} />
            <div className="mt-10">
              <LinkColumn title="Legal" links={LEGAL} />
            </div>
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <h4 className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-(--zl-muted)">
              Registered office, Bangladesh
            </h4>
            <ul className="mt-5 flex flex-col gap-3.5 text-sm">
              <li className="flex items-start gap-3">
                <LuMapPin className="mt-0.5 size-4 shrink-0 text-[#ff3d86]" />
                <span className="text-(--zl-text)/85">258/B, Batar Goli, Boro Moghbazar, Ramna, Dhaka 1217</span>
              </li>
              <li className="flex items-center gap-3">
                <LuPhone className="size-4 shrink-0 text-[#ff3d86]" />
                <a href="tel:+8809696797267" className="text-(--zl-text)/85 hover:text-(--zl-text)">
                  +880 9696 797 267
                </a>
              </li>
              <li className="flex items-center gap-3">
                <LuMail className="size-4 shrink-0 text-[#ff3d86]" />
                <a href="mailto:info@zineticmusic.com" className="text-(--zl-text)/85 hover:text-(--zl-text)">
                  info@zineticmusic.com
                </a>
              </li>
              <li className="flex items-center gap-3">
                <LuBadgeCheck className="size-4 shrink-0 text-[#ff3d86]" />
                <span className="text-(--zl-muted)">Trade License No.: TRAD/DNCC/000393/2024</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="grid gap-6 border-t border-(--zl-line) pt-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h4 className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-(--zl-muted)">We accept</h4>
            <div className="mt-4 flex h-20 items-center justify-center overflow-hidden rounded-2xl border border-(--zl-line) bg-white p-2">
              <Image
                src="/SSLCommerz-Pay-With-logo-All-Size.webp"
                alt="Payment methods accepted through SSLCommerz"
                width={1200}
                height={150}
                className="mx-auto h-auto max-h-full w-auto max-w-full object-contain"
              />
            </div>
          </div>
          <div className="lg:col-span-5">
            <h4 className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-(--zl-muted)">
              Govt. certified shop
            </h4>
            <div className="mt-4 flex h-20 items-center justify-center overflow-hidden rounded-2xl border border-(--zl-line) bg-white p-2">
              <Image
                src="/govt-certified-banner.jpg"
                alt="Government Certified Shop trust badge, DNCC Trade License TRAD/DNCC/000393/2024"
                width={1200}
                height={200}
                className="mx-auto h-auto max-h-full w-auto max-w-full object-contain"
              />
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-(--zl-line) pt-6 text-xs text-(--zl-muted) md:flex-row md:items-center">
          <div className="flex flex-col gap-1.5">
            <p>&copy; {new Date().getFullYear()} Zinetic Music Limited. All rights reserved.</p>
            <p>
              Developed by{" "}
              <a
                href="https://kamrulhasan.site"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-(--zl-text) underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-[#ff3d86]"
              >
                Kamrul Hasan
              </a>
            </p>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {[...LEGAL, ...COMPANY].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition-colors hover:text-(--zl-text)">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
