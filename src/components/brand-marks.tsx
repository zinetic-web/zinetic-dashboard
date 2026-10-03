import Image from "next/image";
import { LuAudioLines, LuClapperboard } from "react-icons/lu";

/** The logo of each product, drawn the same way everywhere (sign-in pages, headers). */

export function ZineticMark({ size = 40 }: { size?: number }) {
  return <Image src="/brand/logo.png" alt="" width={899} height={1140} style={{ height: size, width: "auto" }} />;
}

export function CheckerMark({ size = 40 }: { size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-[28%] bg-[#c2185b]" style={{ width: size, height: size }}>
      <Image src="/brand/logo-slideBar.png" alt="" width={64} height={64} style={{ width: size * 0.66, height: size * 0.66 }} />
    </span>
  );
}

export function StudioMark({ size = 40 }: { size?: number }) {
  return (
    <span
      className="relative flex shrink-0 items-center justify-center rounded-[28%] bg-gradient-to-br from-[#2563eb] via-[#7c3aed] to-[#f97316]"
      style={{ width: size, height: size }}
    >
      <LuAudioLines className="text-white" style={{ width: size * 0.5, height: size * 0.5, transform: `translate(${-size * 0.08}px, ${-size * 0.06}px)` }} />
      <LuClapperboard className="absolute text-white/90" style={{ width: size * 0.38, height: size * 0.38, transform: `translate(${size * 0.2}px, ${size * 0.17}px)` }} />
    </span>
  );
}

export type AuthBrandKey = "client" | "cms" | "studio";

export const AUTH_BRANDS: Record<AuthBrandKey, { name: string; Mark: typeof ZineticMark; signIn: string }> = {
  client: { name: "Zinetic Music", Mark: ZineticMark, signIn: "Choose the dashboard you want to open." },
  cms: { name: "Channel Checker", Mark: CheckerMark, signIn: "Sign in to check channels and manage claims." },
  studio: { name: "AI Studio", Mark: StudioMark, signIn: "Sign in to create with voice, audio and video AI." },
};
