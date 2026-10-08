"use client";

import * as React from "react";
import { PiCornersOutBold, PiDownloadSimpleBold, PiPauseFill, PiPlayFill, PiSpeakerHighBold, PiSpeakerSlashBold } from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * The real video player. Without a `src` it draws the same frame and control
 * bar, switched off, so the output area already looks like the finished result.
 */
export function VideoPlayer({
  src,
  name = "video.mp4",
  disabled = false,
  busy = false,
  vertical = false,
  compact = false,
  className,
}: {
  src?: string;
  name?: string;
  disabled?: boolean;
  busy?: boolean;
  vertical?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const box = React.useRef<HTMLDivElement>(null);
  const ref = React.useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [time, setTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [muted, setMuted] = React.useState(false);
  const off = disabled || !src;
  const progress = duration ? time / duration : 0;

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = ref.current;
    if (!v || !duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - r.left) / r.width) * duration;
  };
  const fullscreen = () => void box.current?.requestFullscreen?.();

  return (
    <div
      ref={box}
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-black text-white",
        vertical ? "aspect-[9/16]" : "aspect-video",
        className
      )}
    >
      {!off && (
        <video
          ref={ref}
          src={src}
          playsInline
          muted={muted}
          preload="metadata"
          onClick={toggle}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          className="absolute inset-0 size-full cursor-pointer object-contain"
        />
      )}

      {off && (
        <div className={cn("absolute inset-0 flex items-center justify-center", busy && "animate-pulse")}>
          <span className="flex size-14 items-center justify-center rounded-full border border-white/15 bg-white/5">
            <PiPlayFill className="size-6 translate-x-0.5 text-white/30" />
          </span>
        </div>
      )}

      <div className={cn("absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-2", off && "opacity-60")}>
        <Button variant="ghost" size="icon-sm" onClick={toggle} disabled={off} aria-label={playing ? "Pause" : "Play"} className="text-white hover:bg-white/15 hover:text-white">
          {playing ? <PiPauseFill /> : <PiPlayFill className="translate-x-px" />}
        </Button>
        <span className={cn("text-xs tabular-nums text-white/80", compact && "hidden")}>{off ? "0:00" : fmt(time)}</span>
        <div onClick={off ? undefined : seek} className={cn("relative h-1.5 flex-1 rounded-full bg-white/25", !off && "cursor-pointer")}>
          <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className={cn("text-xs tabular-nums text-white/80", compact && "hidden")}>{off || !duration ? "0:00" : fmt(duration)}</span>
        <Button variant="ghost" size="icon-sm" onClick={() => setMuted((m) => !m)} disabled={off} aria-label={muted ? "Unmute" : "Mute"} className="text-white hover:bg-white/15 hover:text-white">
          {muted ? <PiSpeakerSlashBold /> : <PiSpeakerHighBold />}
        </Button>
        {off ? (
          <Button variant="ghost" size="icon-sm" disabled aria-label="Download" className="text-white">
            <PiDownloadSimpleBold />
          </Button>
        ) : (
          <Button variant="ghost" size="icon-sm" nativeButton={false} render={<a href={src} download={name} />} aria-label="Download" className="text-white hover:bg-white/15 hover:text-white">
            <PiDownloadSimpleBold />
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" onClick={fullscreen} disabled={off} aria-label="Fullscreen" className="text-white hover:bg-white/15 hover:text-white">
          <PiCornersOutBold />
        </Button>
      </div>
    </div>
  );
}
