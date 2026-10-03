"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { LuLoaderCircle } from "react-icons/lu";
import { saveTrialConfig, type TrialConfigInput } from "@/app/actions/admin-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Tool = { id: string; name: string };

/** The free-trial rules: the shared allowance, and the per-request caps for each tool. */
export function TrialSettings({ config, tools }: { config: TrialConfigInput; tools: Tool[] }) {
  const router = useRouter();
  const [enabled, setEnabled] = React.useState(config.enabled);
  const [days, setDays] = React.useState(String(config.days));
  const [gens, setGens] = React.useState(String(config.max_generations));
  const [spend, setSpend] = React.useState(String(config.max_spend));
  const [limits, setLimits] = React.useState(config.limits);
  const [busy, setBusy] = React.useState(false);

  const setLimit = (tool: string, key: "maxChars" | "maxSeconds", v: string) =>
    setLimits((l) => {
      const next = { ...(l[tool] ?? {}) };
      if (v === "") delete next[key];
      else next[key] = Number(v);
      return { ...l, [tool]: next };
    });

  async function save() {
    setBusy(true);
    const res = await saveTrialConfig({ enabled, days: Number(days), max_generations: Number(gens), max_spend: Number(spend), limits });
    setBusy(false);
    if (res.error) return void toast.error(res.error);
    toast.success("Trial rules saved");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Shared free trial</CardTitle>
              <CardDescription>One allowance per account, spent across every AI Studio service. It stops at whichever limit comes first, and never resets by itself.</CardDescription>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className={enabled ? "font-medium" : "text-muted-foreground"}>{enabled ? "Open" : "Closed"}</span>
              <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Free trial open" />
            </label>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label>Valid for (days)</Label>
            <Input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Successful generations</Label>
            <Input type="number" min={1} value={gens} onChange={(e) => setGens(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Provider cost cap (USD)</Label>
            <Input type="number" min={0} step="0.01" value={spend} onChange={(e) => setSpend(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Limit per request</CardTitle>
          <CardDescription>The most one request can use on the trial, so a long file cannot burn the whole allowance. Leave a box empty for no cap on that.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
            {tools.map((t) => (
              <div key={t.id} className="grid grid-cols-[1fr_6.5rem_6.5rem] items-center gap-2 text-sm">
                <span className="truncate">{t.name}</span>
                <Input type="number" min={0} placeholder="Chars" value={limits[t.id]?.maxChars ?? ""} onChange={(e) => setLimit(t.id, "maxChars", e.target.value)} aria-label={`${t.name} characters`} />
                <Input type="number" min={0} placeholder="Seconds" value={limits[t.id]?.maxSeconds ?? ""} onChange={(e) => setLimit(t.id, "maxSeconds", e.target.value)} aria-label={`${t.name} seconds`} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        <Button onClick={save} disabled={busy}>
          {busy && <LuLoaderCircle className="animate-spin" />} Save trial rules
        </Button>
      </div>
    </div>
  );
}
