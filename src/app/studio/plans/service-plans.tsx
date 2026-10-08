"use client";

import * as React from "react";
import { PlanPicker } from "@/components/studio/plans";
import type { PlanOption } from "@/lib/studio/plans";
import { cn } from "@/lib/utils";

/** Opens the plans for one service right under its card. */
export function ServicePlans({ option, label }: { option: PlanOption; label: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn("h-9 cursor-pointer rounded-lg px-4 text-sm font-semibold", open ? "border border-white/10 bg-white/[0.07] text-white" : "zs-btn")}
      >
        {open ? "Hide plans" : label}
      </button>
      {open && (
        <div className="mt-2 w-full basis-full">
          <PlanPicker options={[option]} />
        </div>
      )}
    </>
  );
}
