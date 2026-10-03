"use client";

import dynamic from "next/dynamic";

// WebGL backgrounds load only on the sign-in pages, and never on the server
const PatternWaves = dynamic(() => import("@/components/backgrounds/PatternWaves"), { ssr: false });
const CRTWarp = dynamic(() => import("@/components/backgrounds/CRTWarp"), { ssr: false });
const LightTunnel = dynamic(() => import("@/components/backgrounds/LightTunnel"), { ssr: false });

export type AuthVariant = "client" | "cms" | "studio";

/** The moving background of a sign-in panel. Each dashboard has its own. */
export function AuthBackdrop({ variant }: { variant: AuthVariant }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      {variant === "client" && <PatternWaves preset="silk" color="#ff3d86" backgroundColor="#0f0f0f" fade="edges" interactive={false} />}
      {variant === "cms" && <CRTWarp color="#ff3d86" backgroundColor="#0b0610" mouseReact={false} />}
      {variant === "studio" && <LightTunnel cableColor="#3d8bff" pulseColor="#ff3d86" tunnelColor="#7c3aed" mouseInteraction={false} />}
    </div>
  );
}
