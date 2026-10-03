"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { LuChevronDown, LuPlus, LuTrash2 } from "react-icons/lu";
import { deleteEngine, saveEngine, setEngineEnabled, type EngineInput } from "@/app/actions/admin";
import { PROVIDERS, providerSupports } from "@/lib/studio/engine-catalog";
import type { Engine } from "@/lib/studio/engines";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type ServiceGroup = { id: string; name: string; engines: Engine[] };

const blank = (service: string, nextIndex: number): EngineInput => ({
  service,
  key: `v${nextIndex}`,
  label: `Engine ${nextIndex}`,
  description: "",
  provider: Object.keys(PROVIDERS).find((p) => providerSupports(p, service)) ?? "",
  model: "",
  credit_cost: 0,
  cost_unit: "generation",
  enabled: true,
  features: [],
  max_duration_seconds: null,
  max_file_mb: null,
  max_chars: null,
  options: {},
  sort: nextIndex,
  provider_rate: null,
  rate_unit: "per_minute",
  trial_allowed: true,
});

const fromEngine = (e: Engine): EngineInput => ({
  id: e.id,
  service: e.service,
  key: e.key,
  label: e.label,
  description: e.description ?? "",
  provider: e.provider,
  model: e.model ?? "",
  credit_cost: e.credit_cost,
  cost_unit: e.cost_unit,
  enabled: e.enabled,
  features: e.features,
  max_duration_seconds: e.max_duration_seconds,
  max_file_mb: e.max_file_mb,
  max_chars: e.max_chars,
  options: e.options,
  sort: e.sort,
  provider_rate: e.provider_rate,
  rate_unit: e.rate_unit,
  trial_allowed: e.trial_allowed,
});

const selectClass = "h-9 w-full rounded-md border bg-background px-3 text-sm";

function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="text-[0.7rem] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function EngineForm({ initial, onDone }: { initial: EngineInput; onDone: () => void }) {
  const router = useRouter();
  const [v, setV] = React.useState(initial);
  const [features, setFeatures] = React.useState(initial.features.join(", "));
  const [options, setOptions] = React.useState(JSON.stringify(initial.options ?? {}, null, 2));
  const [busy, setBusy] = React.useState(false);
  const set = <K extends keyof EngineInput>(k: K, val: EngineInput[K]) => setV((p) => ({ ...p, [k]: val }));
  const num = (s: string) => (s.trim() === "" ? null : Number(s));

  async function save() {
    let parsed: Record<string, unknown>;
    try {
      parsed = options.trim() ? JSON.parse(options) : {};
    } catch {
      toast.error("Processing options must be valid JSON.");
      return;
    }
    setBusy(true);
    const res = await saveEngine({ ...v, features: features.split(",").map((f) => f.trim()).filter(Boolean), options: parsed });
    setBusy(false);
    if (res.error) return void toast.error(res.error);
    toast.success("Engine saved");
    router.refresh();
    onDone();
  }

  const providers = Object.entries(PROVIDERS).filter(([id]) => providerSupports(id, v.service));

  return (
    <div className="grid gap-4 border-t bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Name customers see">
        <Input value={v.label} onChange={(e) => set("label", e.target.value)} />
      </Field>
      <Field label="Key" hint="v1, v2, v3. Cannot be reused in this service.">
        <Input value={v.key} onChange={(e) => set("key", e.target.value)} disabled={Boolean(v.id)} />
      </Field>
      <Field label="Provider">
        <select className={selectClass} value={v.provider} onChange={(e) => set("provider", e.target.value)}>
          {providers.map(([id, p]) => (
            <option key={id} value={id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Model / API endpoint" hint="Passed to the provider as the model.">
        <Input value={v.model} onChange={(e) => set("model", e.target.value)} placeholder="eleven_multilingual_v2" />
      </Field>

      <Field label="Short description" className="sm:col-span-2">
        <Input value={v.description} onChange={(e) => set("description", e.target.value)} placeholder="Shown under the engine name" />
      </Field>
      <Field label="Usage multiplier" hint="1 = the normal amount comes off the customer plan, 2 = twice as much. Use it when one engine costs you more.">
        <Input type="number" min={0} step="0.001" value={v.credit_cost} onChange={(e) => set("credit_cost", Number(e.target.value))} />
      </Field>


      <Field label="What it costs us" hint="The provider's rate. Used to work out the real cost of a run, and to cap the free trial. Empty keeps this engine out of the trial.">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input type="number" min={0} step="0.0001" value={v.provider_rate ?? ""} onChange={(e) => set("provider_rate", e.target.value === "" ? null : Number(e.target.value))} />
          <select className={selectClass} value={v.rate_unit} onChange={(e) => set("rate_unit", e.target.value)}>
            <option value="per_1k_chars">per 1,000 chars</option>
            <option value="per_minute">per minute</option>
            <option value="per_generation">per generation</option>
          </select>
        </div>
      </Field>
      <Field label="Free trial">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={v.trial_allowed} onCheckedChange={(c) => set("trial_allowed", c)} /> Allowed in the trial
        </label>
      </Field>

      <Field label="Longest media (minutes)" hint="Empty means no limit.">
        <Input
          type="number"
          min={0}
          value={v.max_duration_seconds ? v.max_duration_seconds / 60 : ""}
          onChange={(e) => set("max_duration_seconds", e.target.value ? Math.round(Number(e.target.value) * 60) : null)}
        />
      </Field>
      <Field label="Largest file (MB)">
        <Input type="number" min={0} value={v.max_file_mb ?? ""} onChange={(e) => set("max_file_mb", num(e.target.value))} />
      </Field>
      <Field label="Longest text (characters)">
        <Input type="number" min={0} value={v.max_chars ?? ""} onChange={(e) => set("max_chars", num(e.target.value))} />
      </Field>
      <Field label="Sort order">
        <Input type="number" value={v.sort} onChange={(e) => set("sort", Number(e.target.value))} />
      </Field>

      <Field label="Supported features" hint="Comma separated: lipsync, speakers, loop, video, audio ..." className="sm:col-span-2">
        <Input value={features} onChange={(e) => setFeatures(e.target.value)} />
      </Field>
      <Field label="Processing options (JSON)" hint='Defaults for this engine, e.g. {"lipsync": true}' className="sm:col-span-2">
        <textarea
          value={options}
          onChange={(e) => setOptions(e.target.value)}
          rows={3}
          spellCheck={false}
          className="rounded-md border bg-background p-2 font-mono text-xs"
        />
      </Field>

      <div className="flex items-center justify-between gap-3 sm:col-span-2 lg:col-span-4">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={v.enabled} onCheckedChange={(c) => set("enabled", c)} /> Enabled
        </label>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onDone} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving" : "Save engine"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EngineRow({ e }: { e: Engine }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [on, setOn] = React.useState(e.enabled);

  async function toggle(next: boolean) {
    setOn(next);
    const res = await setEngineEnabled(e.id, next);
    if (res.error) {
      setOn(!next);
      toast.error(res.error);
    } else router.refresh();
  }

  async function remove() {
    if (!window.confirm(`Delete ${e.label}? Past generations keep their record.`)) return;
    const res = await deleteEngine(e.id);
    if (res.error) toast.error(res.error);
    else router.refresh();
  }

  return (
    <li className="border-t first:border-t-0">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <div className="min-w-44 flex-1">
          <p className="text-sm font-medium">
            {e.label} <span className="text-xs font-normal text-muted-foreground">({e.key})</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {PROVIDERS[e.provider as keyof typeof PROVIDERS]?.name ?? e.provider}
            {e.model ? ` · ${e.model}` : ""}
          </p>
        </div>
        <p className="text-sm tabular-nums">
          {e.credit_cost}x <span className="text-xs text-muted-foreground">usage</span>
        </p>
        <Switch checked={on} onCheckedChange={toggle} aria-label={`${e.label} enabled`} />
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
            Edit <LuChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
          </Button>
          <Button variant="ghost" size="icon" onClick={remove} aria-label="Delete engine">
            <LuTrash2 className="size-4" />
          </Button>
        </div>
      </div>
      {open && <EngineForm initial={fromEngine(e)} onDone={() => setOpen(false)} />}
    </li>
  );
}

export function EnginesManager({ services }: { services: ServiceGroup[] }) {
  const [adding, setAdding] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      {services.map((s) => (
        <section key={s.id} className="overflow-hidden rounded-xl border">
          <header className="flex items-center justify-between gap-3 bg-muted/40 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold">{s.name}</h3>
              <p className="text-xs text-muted-foreground">
                {s.engines.length === 0 ? "No engines yet" : `${s.engines.filter((e) => e.enabled).length} of ${s.engines.length} enabled`}
                {s.engines.filter((e) => e.enabled).length > 1 && " · customers choose an engine"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setAdding(adding === s.id ? null : s.id)}>
              <LuPlus className="size-4" /> Add engine
            </Button>
          </header>
          <ul>
            {s.engines.map((e) => (
              <EngineRow key={e.id} e={e} />
            ))}
          </ul>
          {adding === s.id && <EngineForm initial={blank(s.id, s.engines.length + 1)} onDone={() => setAdding(null)} />}
        </section>
      ))}
    </div>
  );
}
