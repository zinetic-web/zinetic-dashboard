"use client";

import * as React from "react";
import { postForm } from "@/components/studio/upload";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EnginePicker, Field, FileDrop, ImageFrame, SubmitButton, TextInput, useEngine, useObjectUrl, Workspace } from "@/components/studio/ui";

export function CreatorForm() {
  const router = useRouter();
  const eng = useEngine();
  const [name, setName] = React.useState("");
  const [photo, setPhoto] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const preview = useObjectUrl(photo);

  async function submit() {
    setBusy(true);
    setError(null);
    setDone(false);
    const fd = new FormData();
    fd.append("engine", eng.key);
    fd.append("name", name);
    fd.append("photo", photo!);
    try {
      const res = await postForm("/api/studio/avatars", fd);
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) setError(json.error ?? "Something went wrong.");
      else {
        setDone(true);
        setName("");
        setPhoto(null);
        router.refresh();
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Workspace
      form={
        <>
          <EnginePicker />
          <Field label="Name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Anika, presenter" />
          </Field>
          <Field label="Photo" hint="JPG or PNG">
            <FileDrop accept="image/*" file={photo} onFile={setPhoto} hint="A clear, front-facing photo with good light works best." />
          </Field>
          <SubmitButton busy={busy} disabled={!name.trim() || !photo} busyLabel="Creating avatar" onClick={submit}>
            Create avatar
          </SubmitButton>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </>
      }
      output={
        <Card className="zs-card border-0 bg-transparent ring-0">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="font-heading text-lg">Preview</CardTitle>
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${done ? "bg-emerald-500/15 text-emerald-300" : preview ? "bg-violet-500/15 text-violet-200" : "bg-white/[0.07] text-white/55"}`}>
                <span className={`size-1.5 rounded-full ${done ? "bg-emerald-400" : preview ? "bg-violet-300" : "bg-white/35"}`} />
                {done ? "Saved" : preview ? "Ready" : "Waiting"}
              </span>
            </div>
            <CardDescription>Your photo appears here. Saved avatars show up in Avatar video under Yours.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ImageFrame src={preview} />
            {done && (
              <Alert>
                <AlertDescription>Avatar saved. You can use it in Avatar video now.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      }
    />
  );
}
