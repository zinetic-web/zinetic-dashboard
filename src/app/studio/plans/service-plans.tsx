"use client";

import * as React from "react";
import { PlanPicker } from "@/components/studio/plans";
import { Dropdown } from "@/components/studio/dropdown";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { PlanOption } from "@/lib/studio/plans";

/** Opens the plans for one service in a window, so the card it came from stays as it is. */
export function ServicePlans({ option, label }: { option: PlanOption; label: string }) {
  const [open, setOpen] = React.useState(false);
  const [versionId, setVersionId] = React.useState(option.versions?.[0]?.id ?? "");
  const version = option.versions?.find((v) => v.id === versionId) ?? option.versions?.[0] ?? null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="zs-btn h-9 cursor-pointer rounded-full px-4 text-sm font-semibold">
        {label}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="zs-dialog dark max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 pr-8">
              <DialogTitle className="font-heading text-lg font-semibold">{option.serviceName}</DialogTitle>
              <DialogDescription className={version ? "mt-1 max-w-md text-sm leading-relaxed text-white/55" : "mt-1 text-sm leading-relaxed text-white/55"}>
                {version ? (
                  <>
                    Pick a plan and pay on SSLCommerz.
                    <br />
                    It is added the moment the payment is confirmed.
                  </>
                ) : (
                  "Pick a plan and pay on SSLCommerz. It is added the moment the payment is confirmed."
                )}
              </DialogDescription>
            </div>
            {option.versions && version && (
              <div className="flex w-full flex-col gap-2 sm:mr-8 sm:w-64 sm:shrink-0">
                <Dropdown value={version.id} onChange={setVersionId} label="Version" options={option.versions.map((v) => ({ value: v.id, label: v.label }))} />
                {version.note && <p className="text-xs leading-relaxed text-white/50">{version.note}</p>}
              </div>
            )}
          </div>
          <PlanPicker options={[option]} version={version?.id} />
        </DialogContent>
      </Dialog>
    </>
  );
}
