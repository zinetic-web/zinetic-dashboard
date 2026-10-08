"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { PiArrowUpRightBold, PiClockBold } from "react-icons/pi";
import { cn } from "@/lib/utils";
import { TOOLS, type StudioTool } from "@/lib/studio/tools";
import { WaveArt } from "@/components/studio/audio-player";

/** Looping muted clip (or still) that fills its parent. Plays only while visible. */
export function MediaBg({
  media,
  className,
  playOnHover = false,
}: {
  media: StudioTool["media"];
  className?: string;
  playOnHover?: boolean;
}) {
  const ref = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || playOnHover) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) void el.play().catch(() => {});
      else el.pause();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [playOnHover]);

  if (media.type === "image") {
    return <Image src={media.src} alt="" fill unoptimized sizes="400px" className={cn("object-cover", className)} />;
  }
  return (
    <video
      ref={ref}
      src={media.src}
      muted
      loop
      playsInline
      preload="metadata"
      className={cn("absolute inset-0 size-full object-cover", className)}
    />
  );
}

export type BentoSize = "lg" | "md" | "sm";

// takes an id, not the tool: tool objects hold icon components, which cannot cross from a server page
export function BentoTile({
  toolId,
  art,
  size = "sm",
  className,
}: {
  toolId: string;
  art: StudioTool["media"];
  size?: BentoSize;
  className?: string;
}) {
  const tool = TOOLS.find((t) => t.id === toolId)!;
  const Icon = tool.icon;
  const ref = React.useRef<HTMLDivElement>(null);

  const hover = (on: boolean) => {
    const v = ref.current?.querySelector("video");
    if (!v) return;
    if (on) void v.play().catch(() => {});
    else v.pause();
  };

  const isAudio = tool.group === "audio";
  // artwork made for the tile carries its own title, so the overlay text and icon would double up
  const custom = art.src.startsWith("/studio/");

  const inner = (
    <div
      ref={ref}
      onMouseEnter={() => hover(true)}
      onMouseLeave={() => hover(false)}
      className="group relative isolate flex h-full min-h-44 flex-col justify-between overflow-hidden rounded-3xl bg-zinc-900 p-4 text-white ring-1 ring-white/10 transition-shadow duration-500 hover:ring-white/30"
    >
      <div
        className={cn(
          "absolute inset-0 -z-10 transition-[transform,filter] duration-700",
          tool.href && "group-hover:scale-[1.04]",
          custom && "brightness-[.72] saturate-[.85] group-hover:brightness-100 group-hover:saturate-100",
          tool.soon && "grayscale"
        )}
      >
        <MediaBg media={art} playOnHover />
      </div>
      {custom && (
        <>
          {/* calms the busy artwork: dark at rest, clears on hover */}
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/10 to-black/30 transition-opacity duration-500 group-hover:opacity-30" />
          <div aria-hidden className="absolute inset-0 -z-10 rounded-3xl shadow-[inset_0_0_60px_rgb(0_0_0/0.45)]" />
        </>
      )}
      {!custom && <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/25 to-black/5" />}
      {!custom && size === "lg" && <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-black/55 to-transparent" />}
      {!custom && isAudio && size !== "sm" && (
        <div aria-hidden className="absolute inset-x-5 top-5 -z-10 h-10 opacity-0 transition-opacity duration-500 group-hover:opacity-70">
          <WaveArt accent="from-white to-white/60" />
        </div>
      )}

      <div className={cn("flex items-start", custom ? "justify-end" : "justify-between")}>
        {!custom && (
        <span className={cn("flex items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg [&_svg]:size-5", tool.accent, size === "sm" ? "size-10" : "size-12")}>
          <Icon />
        </span>
        )}
        {tool.soon ? (
          <span className="flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[0.7rem] backdrop-blur">
            <PiClockBold className="size-3" /> Soon
          </span>
        ) : (
          <span className="flex size-9 items-center justify-center rounded-full bg-white/15 backdrop-blur transition-all duration-300 group-hover:bg-white group-hover:text-black">
            <PiArrowUpRightBold className="size-4" />
          </span>
        )}
      </div>

      {custom && (
        <p className="translate-y-2 text-sm leading-snug text-white/95 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          {tool.soon ? "Coming soon" : tool.blurb}
        </p>
      )}
      {!custom && (
      <div>
        <p className={cn("font-heading leading-tight font-semibold", size === "lg" ? "text-3xl sm:text-4xl" : size === "md" ? "text-2xl" : "text-lg")}>{tool.name}</p>
        <p className={cn("mt-1.5 text-white/70", size === "lg" ? "max-w-sm text-sm sm:text-base" : size === "md" ? "line-clamp-3 text-sm" : "line-clamp-1 text-[0.8rem]")}>
          {tool.blurb}
        </p>
      </div>
      )}
    </div>
  );

  return (
    <div className={className}>{tool.href ? <Link href={tool.href} className="block h-full">{inner}</Link> : inner}</div>
  );
}
