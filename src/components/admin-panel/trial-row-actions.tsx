"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { endTrial, resetTrial } from "@/app/actions/admin-panel";
import { Button } from "@/components/ui/button";

export function TrialRowActions({ userId, ended }: { userId: string; ended: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const run = (fn: () => Promise<{ error: string | null }>, ok: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.error) return void toast.error(res.error);
      toast.success(ok);
      router.refresh();
    });
  return (
    <div className="inline-flex gap-1.5">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => resetTrial(userId), "Trial reset")}>
        Reset
      </Button>
      {!ended && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => endTrial(userId), "Trial ended")}>
          End
        </Button>
      )}
    </div>
  );
}
