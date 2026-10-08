"use client";

import * as React from "react";
import Image from "next/image";
import { PiCheckBold, PiMagnifyingGlassBold } from "react-icons/pi";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export type AvatarItem = { id: string; name: string; image: string; mine?: boolean };

export function AvatarPicker({
  items,
  value,
  onChange,
}: {
  items: AvatarItem[];
  value: string;
  onChange: (id: string, mine: boolean) => void;
}) {
  const [q, setQ] = React.useState("");
  const needle = q.trim().toLowerCase();
  const shown = (needle ? items.filter((i) => i.name.toLowerCase().includes(needle)) : items).slice(0, 80);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <PiMagnifyingGlassBold className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${items.length} avatars`} className="pl-8" />
      </div>
      <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto rounded-lg border p-2">
        {shown.length === 0 && <p className="col-span-3 py-6 text-center text-sm text-muted-foreground">No avatars found.</p>}
        {shown.map((a) => {
          const active = a.id === value;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onChange(a.id, Boolean(a.mine))}
              aria-pressed={active}
              className={cn(
                "relative aspect-[3/4] cursor-pointer overflow-hidden rounded-md border bg-muted text-left transition-shadow",
                active && "ring-2 ring-primary"
              )}
            >
              <Image src={a.image} alt={a.name} fill unoptimized sizes="120px" className="object-cover" />
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pt-5 pb-1 text-[0.7rem] text-white">{a.name}</span>
              {a.mine && <Badge className="absolute top-1 left-1 h-4 px-1.5 text-[0.6rem]">Yours</Badge>}
              {active && (
                <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <PiCheckBold className="size-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
