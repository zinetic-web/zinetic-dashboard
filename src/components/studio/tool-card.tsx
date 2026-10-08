"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { LuArrowRight } from "react-icons/lu";
import { TOOLS } from "@/lib/studio/tools";

/** A tool on the Home page: a cover clip that shows what it does (plays on hover), then name and one line. */
export function ToolCard({ id }: { id: string }) {
  const tool = TOOLS.find((t) => t.id === id)!;
  const ref = React.useRef<HTMLVideoElement>(null);
  const Icon = tool.icon;
  const live = Boolean(tool.href);

  const inner = (
    <>
      <div className="relative aspect-[16/9] overflow-hidden bg-black/40">
        {tool.media.type === "video" ? (
          <video
            ref={ref}
            src={`${tool.media.src}#t=0.5`}
            preload="metadata"
            muted
            loop
            playsInline
            aria-hidden
            className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <Image src={tool.media.src} alt="" fill unoptimized sizes="(min-width: 1024px) 30vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
        )}
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0e0e1a] via-transparent to-black/20" />
        {!live && <span className="absolute top-3 right-3 rounded-full bg-black/50 px-2 py-0.5 text-[0.65rem] text-white/70 backdrop-blur">Soon</span>}
      </div>
      <div className="flex items-center gap-3.5 p-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-violet-300 ring-1 ring-white/10 [&_svg]:size-5">
          <Icon />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{tool.name}</span>
          <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-white/50">{tool.blurb}</span>
        </span>
        {live && <LuArrowRight className="size-4 shrink-0 text-white/30 transition-all group-hover:translate-x-0.5 group-hover:text-white" />}
      </div>
    </>
  );

  const play = () => ref.current?.play().catch(() => {});
  const stop = () => {
    const v = ref.current;
    if (v) {
      v.pause();
      v.currentTime = 0.5;
    }
  };

  return live ? (
    <Link href={tool.href!} onMouseEnter={play} onMouseLeave={stop} onFocus={play} onBlur={stop} className="group zs-card zs-shine flex h-full flex-col overflow-hidden transition-colors hover:border-violet-400/40">
      {inner}
    </Link>
  ) : (
    <div className="group zs-card zs-shine flex h-full flex-col overflow-hidden opacity-60">{inner}</div>
  );
}
