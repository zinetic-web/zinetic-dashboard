"use client";

import * as React from "react";
import { postForm } from "@/components/studio/upload";
import { useJob } from "@/components/studio/use-job";
import { Dropdown } from "@/components/studio/dropdown";
import {
  AudioResult,
  EnginePicker,
  Field,
  FileDrop,
  Output,
  SelectField,
  Segmented,
  SubmitButton,
  useEngine,
  VideoResult,
  Workspace,
} from "@/components/studio/ui";

export type LanguageOption = { value: string; label: string };

/**
 * Dubbing is one service with a version (v1 or v2) and, for v1, a mode: clean output or a watermark
 * at a lower cost. Each combination is an engine behind the scenes, this picks between them.
 */
function DubbingVersion() {
  const eng = useEngine();
  const version = eng.key === "v2" ? "v2" : "v1";
  const mode = eng.key === "v1-watermark" ? "watermark" : "clean";
  const note = version === "v2" ? "Keeps each voice, tone and emotion. 90+ languages. Uses about 4x more of your plan." : mode === "watermark" ? "Marked output at a lower cost. Goes about 1.5x further." : "Clean output, keeps each speaker's own voice.";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">Version</p>
        <Dropdown
          value={version}
          onChange={(v) => eng.setKey(v === "v2" ? "v2" : mode === "watermark" ? "v1-watermark" : "v1")}
          label="Dubbing version"
          options={[
            { value: "v1", label: "Dubbing v1", hint: "Standard" },
            { value: "v2", label: "Dubbing v2", hint: "Preserves emotion" },
          ]}
        />
      </div>
      {version === "v1" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Mode</p>
          <Segmented
            value={mode}
            onChange={(m) => eng.setKey(m === "watermark" ? "v1-watermark" : "v1")}
            options={[
              { value: "clean", label: "No watermark" },
              { value: "watermark", label: "With watermark" },
            ]}
          />
        </div>
      )}
      <p className="text-xs leading-relaxed text-white/50">{note}</p>
    </div>
  );
}

/**
 * Dubbing and video translation are one screen: the same job can run on either
 * provider, so the engine choice decides the language list and whether lip sync
 * is offered.
 */
export function TranslateForm({
  endpoint,
  field,
  accept,
  hint,
  busyMessage,
  languagesByEngine,
  resultName,
}: {
  endpoint: string;
  field: string;
  accept: string;
  hint: string;
  busyMessage: string;
  languagesByEngine: Record<string, LanguageOption[]>;
  resultName: string;
}) {
  const eng = useEngine();
  const [file, setFile] = React.useState<File | null>(null);
  const [picked, setPicked] = React.useState("");
  const [lipsync, setLipsync] = React.useState("yes");
  const [quality, setQuality] = React.useState("speed");
  const [speakers, setSpeakers] = React.useState("0");
  const { state, run } = useJob();

  const languages = languagesByEngine[eng.key] ?? [];
  const language = languages.some((l) => l.value === picked)
    ? picked
    : (languages.find((l) => l.label.startsWith("English"))?.value ?? languages[0]?.value ?? "");
  const isVideo = Boolean(file?.type.startsWith("video"));

  function submit() {
    const fd = new FormData();
    fd.append("engine", eng.key);
    fd.append(field, file!);
    fd.append("language", language);
    fd.append("lipsync", eng.has("lipsync") && lipsync === "yes" ? "true" : "false");
    if (eng.has("lipsync")) {
      fd.append("mode", quality);
      if (speakers !== "0") fd.append("speakers", speakers);
    }
    return run(() => postForm(endpoint, fd), { async: true, message: busyMessage, eta: "Usually a few minutes for every minute of video." });
  }

  return (
    <Workspace
      form={
        <>
          {eng.engines.some((e) => e.key === "v1-watermark") ? <DubbingVersion /> : <EnginePicker />}
          <Field label={accept.includes("audio") ? "Audio or video" : "Video"} hint="Up to 200 MB">
            <FileDrop accept={accept} file={file} onFile={setFile} hint={hint} />
          </Field>
          <Field label="Translate into">
            <SelectField value={language} onChange={setPicked} options={languages} placeholder="Languages unavailable" />
          </Field>
          {eng.has("lipsync") && (
            <Field label="Lip sync" hint="Match the mouth to the new language">
              <Segmented value={lipsync} onChange={setLipsync} options={[{ value: "yes", label: "On" }, { value: "no", label: "Off" }]} />
            </Field>
          )}
          {eng.has("lipsync") && lipsync === "yes" && (
            <Field label="Quality" hint="Best quality handles faces that turn or are partly covered, and takes longer">
              <Segmented value={quality} onChange={setQuality} options={[{ value: "speed", label: "Fast" }, { value: "precision", label: "Best quality" }]} />
            </Field>
          )}
          {eng.has("lipsync") && (
            <Field label="People speaking" hint="Leave on automatic unless voices get mixed up">
              <SelectField
                value={speakers}
                onChange={setSpeakers}
                options={[{ value: "0", label: "Detect automatically" }, ...[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: n === 1 ? "1 person" : `${n} people` }))]}
              />
            </Field>
          )}
          <SubmitButton busy={state.phase === "working"} disabled={!file || !language} busyLabel="Working" onClick={submit}>
            Start
          </SubmitButton>
        </>
      }
      output={
        <Output state={state} idle="The result appears here." working="This takes a few minutes. You can leave this page, it will be in your Library.">
          {state.phase === "done" && (isVideo || accept === "video/*" ? <VideoResult id={state.id} name={`${resultName}.mp4`} /> : <AudioResult id={state.id} name={`${resultName}.mp3`} />)}
        </Output>
      }
    />
  );
}
