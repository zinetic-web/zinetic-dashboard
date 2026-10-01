"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlanPicker } from "@/components/studio/plans";
import type { PlanOption } from "@/lib/studio/plans";

/** Opens the plans for one service right under its row. */
export function ServicePlans({ option, label, takenTrials = [] }: { option: PlanOption; label: string; takenTrials?: string[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" variant={open ? "secondary" : "default"} onClick={() => setOpen((o) => !o)}>
        {open ? "Hide plans" : label}
      </Button>
      {open && (
        <div className="mt-2 w-full basis-full">
          <PlanPicker options={[option]} takenTrials={takenTrials} />
        </div>
      )}
    </>
  );
}
