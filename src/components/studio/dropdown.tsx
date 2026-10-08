"use client";

import * as React from "react";
import { PiCaretDownBold, PiCheckBold, PiMagnifyingGlassBold } from "react-icons/pi";
import { cn } from "@/lib/utils";

export type DropdownOption = { value: string; label: string; hint?: string; group?: string };

/**
 * The Studio's own dropdown. A button that opens a styled list: optional search for long lists,
 * group headings, a check on the chosen one, closes on outside click or Escape.
 * `inline` opens the list in the flow of the page instead of floating, for use inside scrolling panels.
 */
export function Dropdown({
  value,
  onChange,
  options,
  placeholder = "Choose",
  label,
  icon,
  inline = false,
  searchable,
  className,
  buttonClassName,
  align = "left",
}: {
  value: string;
  onChange: (v: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  /** names the control for screen readers */
  label?: string;
  icon?: React.ReactNode;
  inline?: boolean;
  searchable?: boolean;
  className?: string;
  buttonClassName?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const box = React.useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);
  const showSearch = searchable ?? options.length > 8;

  React.useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc, true);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc, true);
    };
  }, [open]);

  const needle = q.trim().toLowerCase();
  const shown = needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options;
  const groups: [string, DropdownOption[]][] = [];
  for (const o of shown) {
    const g = o.group ?? "";
    const found = groups.find(([name]) => name === g);
    if (found) found[1].push(o);
    else groups.push([g, [o]]);
  }

  const list = (
    <div className={cn("zs-shine flex flex-col rounded-xl border border-white/10 bg-[#101020] p-1.5", inline ? "mt-1.5" : "absolute top-full z-40 mt-1.5 min-w-full shadow-[0_24px_60px_-20px_rgb(0_0_0/0.9)]", !inline && (align === "right" ? "right-0" : "left-0"))}>
      {showSearch && (
        <div className="relative mb-1">
          <PiMagnifyingGlassBold className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-white/40" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="h-9 w-full rounded-lg bg-white/[0.05] pr-2 pl-8 text-sm text-white outline-none placeholder:text-white/35"
          />
        </div>
      )}
      <ul role="listbox" aria-label={label} className="max-h-64 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
        {groups.length === 0 && <li className="px-3 py-4 text-center text-sm text-white/40">No match</li>}
        {groups.map(([name, items]) => (
          <li key={name || "_"}>
            {name && <p className="px-2.5 pt-2 pb-1 text-[0.68rem] font-semibold tracking-wide text-white/35 uppercase">{name}</p>}
            <ul>
              {items.map((o) => {
                const on = o.value === value;
                return (
                  <li key={o.value} role="option" aria-selected={on}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(o.value);
                        setOpen(false);
                        setQ("");
                      }}
                      className={cn("flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors", on ? "bg-violet-500/15 text-white" : "text-white/75 hover:bg-white/[0.07] hover:text-white")}
                    >
                      <span className="min-w-0 flex-1 truncate">{o.label}</span>
                      {o.hint && <span className="shrink-0 text-xs text-white/40">{o.hint}</span>}
                      <span className="flex size-4 shrink-0 items-center justify-center">{on && <PiCheckBold className="size-4 text-violet-300" />}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div ref={box} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className={cn(
          "flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-xl border bg-white/[0.04] px-3.5 text-left text-sm transition-colors",
          open ? "border-violet-400/60" : "border-white/10 hover:border-white/20",
          buttonClassName
        )}
      >
        {icon && <span className="shrink-0 text-white/50">{icon}</span>}
        <span className={cn("min-w-0 flex-1 truncate", current ? "text-white" : "text-white/40")}>{current?.label ?? placeholder}</span>
        <PiCaretDownBold className={cn("size-4 shrink-0 text-white/50 transition-transform", open && "rotate-180")} />
      </button>
      {open && list}
    </div>
  );
}
