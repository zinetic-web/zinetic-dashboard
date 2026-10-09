"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { PiLightningFill, PiMicrophoneBold, PiMicrophoneSlashBold, PiPhoneDisconnectBold, PiPlusBold, PiTrashBold, PiWarningBold } from "react-icons/pi";
import { LuLoaderCircle } from "react-icons/lu";
import type { Voice } from "@/lib/studio/elevenlabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dropdown } from "@/components/studio/dropdown";
import { VoiceLibrary, type VoiceChoice } from "@/components/studio/voice-library";
import { Field, SelectField, TextArea, TextInput, Workspace } from "@/components/studio/ui";
import { cn } from "@/lib/utils";

export type AgentRow = { id: string; name: string; voiceId: string; voiceName: string; firstMessage: string; instructions: string; language: string; burst: boolean };

const LANGUAGES: [string, string][] = [
  ["en", "English"], ["bn", "Bangla"], ["hi", "Hindi"], ["ur", "Urdu"], ["ar", "Arabic"], ["es", "Spanish"], ["fr", "French"], ["de", "German"],
  ["pt", "Portuguese"], ["it", "Italian"], ["tr", "Turkish"], ["ru", "Russian"], ["ja", "Japanese"], ["ko", "Korean"], ["zh", "Chinese"], ["id", "Indonesian"], ["ta", "Tamil"], ["nl", "Dutch"], ["pl", "Polish"],
];

const EMPTY = { name: "", voice: null as VoiceChoice | null, firstMessage: "Hello! How can I help you today?", instructions: "", language: "en", burst: false };
const NEW = "__new";

/** Speech Engine: design a voice agent, then talk to it. The agent listens, thinks and answers out loud, live. */
export function SpeechEngine({ agents, voices, maxAgents }: { agents: AgentRow[]; voices: Voice[]; maxAgents: number }) {
  return (
    <ConversationProvider>
      <Inner agents={agents} voices={voices} maxAgents={maxAgents} />
    </ConversationProvider>
  );
}

function Inner({ agents, voices, maxAgents }: { agents: AgentRow[]; voices: Voice[]; maxAgents: number }) {
  const router = useRouter();
  const defaults: VoiceChoice[] = React.useMemo(() => voices.map((v) => ({ id: v.id, name: v.name, meta: v.labels ?? v.category, previewUrl: v.previewUrl })), [voices]);
  const [selected, setSelected] = React.useState(agents[0]?.id ?? NEW);
  const [draft, setDraft] = React.useState(() => load(agents[0], defaults));
  const [busy, setBusy] = React.useState<"save" | "delete" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const current = agents.find((a) => a.id === selected) ?? null;

  function pick(id: string) {
    setSelected(id);
    setError(null);
    setDraft(load(agents.find((a) => a.id === id), defaults));
  }

  async function save() {
    setBusy("save");
    setError(null);
    const body = { action: current ? "update" : "create", id: current?.id, name: draft.name, voiceId: draft.voice?.id, voiceName: draft.voice?.name, firstMessage: draft.firstMessage, instructions: draft.instructions, language: draft.language, burst: draft.burst };
    const res = await fetch("/api/studio/agents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
    setBusy(null);
    if (!res.ok || !j.id) return setError(j.error ?? "Could not save the agent.");
    setSelected(j.id);
    router.refresh();
  }

  async function remove() {
    if (!current || !window.confirm(`Delete ${current.name}? This cannot be undone.`)) return;
    setBusy("delete");
    const res = await fetch("/api/studio/agents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id: current.id }) });
    setBusy(null);
    if (!res.ok) return setError("Could not delete the agent.");
    pick(agents.find((a) => a.id !== current.id)?.id ?? NEW);
    router.refresh();
  }

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const ready = draft.name.trim() && draft.voice && draft.instructions.trim();

  return (
    <Workspace
      form={
        <>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Your agents</p>
            <Dropdown
              value={selected}
              onChange={pick}
              label="Choose an agent"
              options={[...agents.map((a) => ({ value: a.id, label: a.name, hint: a.voiceName })), ...(agents.length < maxAgents ? [{ value: NEW, label: "New agent" }] : [])]}
              icon={selected === NEW ? <PiPlusBold className="size-4" /> : undefined}
            />
          </div>

          <Field label="Name">
            <TextInput value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Front desk, language tutor, sales helper" maxLength={80} />
          </Field>
          <Field label="Voice">
            <VoiceLibrary value={draft.voice} onChange={(v) => set("voice", v)} defaults={defaults} />
          </Field>
          <Field label="Who is it, and how should it behave?" hint={`${draft.instructions.length.toLocaleString()} / 4,000`}>
            <TextArea value={draft.instructions} onChange={(v) => set("instructions", v)} max={4000} rows={7} placeholder="You are a friendly receptionist for a dental clinic. Answer questions about opening hours and book appointments. Keep answers short." />
          </Field>
          <Field label="First thing it says">
            <TextInput value={draft.firstMessage} onChange={(e) => set("firstMessage", e.target.value)} maxLength={300} />
          </Field>
          <Field label="Language">
            <SelectField value={draft.language} onChange={(v) => set("language", v)} options={LANGUAGES.map(([value, label]) => ({ value, label }))} />
          </Field>

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
            <span>
              <span className="flex items-center gap-1.5 font-semibold">
                <PiLightningFill className="size-4 text-amber-300" /> Burst
              </span>
              <span className="block text-xs leading-relaxed text-white/45">When many conversations are open at once, extra ones can still connect. Those are billed at twice the usage.</span>
            </span>
            <Switch checked={draft.burst} onCheckedChange={(v) => set("burst", v)} />
          </label>

          <div className="flex gap-2">
            <Button onClick={save} disabled={!ready || busy !== null} size="lg" className="flex-1">
              {busy === "save" && <LuLoaderCircle className="animate-spin" />}
              {current ? "Save changes" : "Create agent"}
            </Button>
            {current && (
              <Button onClick={remove} disabled={busy !== null} size="lg" variant="destructive" aria-label="Delete agent">
                {busy === "delete" ? <LuLoaderCircle className="animate-spin" /> : <PiTrashBold />}
              </Button>
            )}
          </div>
          {error && (
            <p className="flex items-start gap-2 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">
              <PiWarningBold className="mt-0.5 size-4 shrink-0" /> {error}
            </p>
          )}
        </>
      }
      output={<Talk agent={current} />}
    />
  );
}

function load(a: AgentRow | undefined, defaults: VoiceChoice[]) {
  if (!a) return { ...EMPTY, voice: defaults[0] ?? null };
  return { name: a.name, voice: { id: a.voiceId, name: a.voiceName || "Chosen voice" } as VoiceChoice, firstMessage: a.firstMessage, instructions: a.instructions, language: a.language, burst: a.burst };
}

/* ------------------------------------------------------------ the conversation */

type Line = { who: "you" | "agent"; text: string };
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function Talk({ agent }: { agent: AgentRow | null }) {
  const router = useRouter();
  const [lines, setLines] = React.useState<Line[]>([]);
  const [starting, setStarting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [elapsed, setElapsed] = React.useState(0);
  const [ended, setEnded] = React.useState<{ seconds: number; burst: boolean } | null>(null);
  const session = React.useRef<{ id: string; started: number; max: number } | null>(null);
  const linesRef = React.useRef<Line[]>([]);
  const logRef = React.useRef<HTMLDivElement>(null);

  const conversation = useConversation({
    onMessage: (m) => {
      const line: Line = { who: m.role === "user" ? "you" : "agent", text: m.message };
      linesRef.current = [...linesRef.current, line];
      setLines(linesRef.current);
    },
    onError: (message) => setError(typeof message === "string" ? message : "The conversation had a problem."),
  });
  const connected = conversation.status === "connected";

  const finish = React.useCallback(async () => {
    const s = session.current;
    if (!s) return;
    session.current = null;
    const conversationId = (() => {
      try {
        return conversation.getId();
      } catch {
        return undefined;
      }
    })();
    conversation.endSession();
    const seconds = Math.round((Date.now() - s.started) / 1000);
    const text = linesRef.current.map((l) => `${l.who === "you" ? "You" : "Agent"}: ${l.text}`).join("\n\n");
    try {
      const res = await fetch("/api/studio/speech-engine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "finish", id: s.id, seconds, conversationId, text }) });
      const j = (await res.json().catch(() => ({}))) as { seconds?: number; burst?: boolean };
      setEnded({ seconds: j.seconds ?? seconds, burst: Boolean(j.burst) });
      router.refresh();
    } catch {
      setError("The conversation ended but could not be saved. Your plan is only charged for the time it ran.");
    }
  }, [conversation, router]);

  React.useEffect(() => {
    if (!connected) return;
    const t = setInterval(() => {
      const s = session.current;
      if (!s) return;
      const sec = (Date.now() - s.started) / 1000;
      setElapsed(sec);
      if (sec >= s.max - 1) void finish();
    }, 500);
    return () => clearInterval(t);
  }, [connected, finish]);

  React.useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  // leaving the page ends the conversation, and what was not used goes back
  React.useEffect(() => {
    return () => {
      if (session.current) void finish();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    if (!agent) return;
    setError(null);
    setEnded(null);
    linesRef.current = [];
    setLines([]);
    setStarting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStarting(false);
      return setError("Allow the microphone in your browser to talk to your agent.");
    }
    try {
      const res = await fetch("/api/studio/speech-engine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", agent: agent.id }) });
      const j = (await res.json().catch(() => ({}))) as { id?: string; signedUrl?: string; maxSeconds?: number; error?: string };
      if (!res.ok || !j.id || !j.signedUrl) {
        setError(j.error ?? "Could not start the conversation.");
        setStarting(false);
        return;
      }
      session.current = { id: j.id, started: Date.now(), max: j.maxSeconds ?? 600 };
      setElapsed(0);
      conversation.startSession({ signedUrl: j.signedUrl, connectionType: "websocket" });
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
    setStarting(false);
  }

  const speaking = connected && conversation.isSpeaking;
  const label = !agent ? "Create an agent to talk to" : conversation.status === "connecting" || starting ? "Connecting" : connected ? (speaking ? "Speaking" : "Listening") : ended ? "Conversation saved" : "Ready";

  return (
    <div className="zs-card flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold">{agent ? agent.name : "Talk to your agent"}</h2>
        <span className={cn("zs-shine zs-shine-thin flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium", connected ? "bg-violet-500/20 text-violet-100" : ended ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[0.07] text-white/55")}>
          <span className={cn("size-1.5 rounded-full", connected ? "animate-pulse bg-violet-300" : ended ? "bg-emerald-400" : "bg-white/35")} />
          {label}
        </span>
      </div>

      <div className="flex flex-col items-center gap-3 py-4">
        <div className="relative flex size-36 items-center justify-center">
          <span className={cn("absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/40 to-blue-500/30 blur-2xl transition-opacity", connected ? "opacity-100" : "opacity-30")} />
          <span className={cn("zs-shine relative flex size-28 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/50 to-blue-500/40 ring-1 ring-white/20 transition-transform duration-500", speaking && "scale-110 animate-pulse", connected && !speaking && "scale-100")}>
            {connected && conversation.isMuted ? <PiMicrophoneSlashBold className="size-9 text-white/80" /> : <PiMicrophoneBold className="size-9 text-white/90" />}
          </span>
        </div>
        {connected && <p className="text-sm tabular-nums text-white/60">{clock(elapsed)}</p>}
        {ended && <p className="text-xs text-white/50">{clock(ended.seconds)} used{ended.burst ? " · billed as a burst call" : ""}. The transcript is in your Library.</p>}
      </div>

      <div className="flex justify-center gap-2">
        {connected ? (
          <>
            <Button variant="outline" size="lg" onClick={() => conversation.setMuted(!conversation.isMuted)}>
              {conversation.isMuted ? <PiMicrophoneSlashBold /> : <PiMicrophoneBold />} {conversation.isMuted ? "Unmute" : "Mute"}
            </Button>
            <Button variant="destructive" size="lg" onClick={finish}>
              <PiPhoneDisconnectBold /> End
            </Button>
          </>
        ) : (
          <Button size="lg" onClick={start} disabled={!agent || starting || conversation.status === "connecting"}>
            {starting || conversation.status === "connecting" ? <LuLoaderCircle className="animate-spin" /> : <PiMicrophoneBold />} Start talking
          </Button>
        )}
      </div>

      {lines.length > 0 && (
        <div ref={logRef} className="flex max-h-72 flex-col gap-2 overflow-y-auto rounded-xl border border-white/[0.08] bg-black/20 p-3 text-sm">
          {lines.map((l, i) => (
            <p key={i} className={cn("max-w-[85%] rounded-xl px-3 py-2 leading-relaxed", l.who === "you" ? "self-end bg-violet-500/20" : "self-start bg-white/[0.06]")}>
              {l.text}
            </p>
          ))}
        </div>
      )}
      {error && (
        <p className="flex items-start gap-2 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">
          <PiWarningBold className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      )}
      <p className="text-xs leading-relaxed text-white/40">Each conversation runs up to 10 minutes. It is reserved from your plan when it starts, and what you did not use goes back when it ends.</p>
    </div>
  );
}
