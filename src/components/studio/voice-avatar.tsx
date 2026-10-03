import { cn } from "@/lib/utils";

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** A soft gradient orb that is always the same for the same voice, so every voice has a face. */
export function VoiceAvatar({ id, size = 40, className }: { id: string; size?: number; className?: string }) {
  const h = hash(id);
  const a = h % 360;
  const b = (a + 70 + ((h >>> 8) % 120)) % 360;
  const c = (a + 200 + ((h >>> 16) % 100)) % 360;
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 rounded-full", className)}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 28% 24%, hsl(${a} 90% 78%) 0%, transparent 52%), radial-gradient(circle at 78% 72%, hsl(${b} 85% 62%) 0%, transparent 58%), radial-gradient(circle at 50% 100%, hsl(${c} 70% 38%) 0%, transparent 70%), hsl(${a} 45% 30%)`,
        boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.12), inset 0 -6px 12px rgb(0 0 0 / 0.18)",
      }}
    />
  );
}
