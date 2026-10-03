"use client";

import * as React from "react";

// Progress of the upload in flight (0 to 100), or null when nothing is uploading. Buttons read it.
let progress: number | null = null;
const listeners = new Set<() => void>();
const publish = (p: number | null) => {
  progress = p;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useUploadProgress = () => React.useSyncExternalStore(subscribe, () => progress, () => null);

const asResponse = (error: string, status = 500) => new Response(JSON.stringify({ error }), { status, headers: { "Content-Type": "application/json" } });

function put(url: string, file: File, type: string, onProgress: (loaded: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`upload ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("upload failed"));
    xhr.send(file);
  });
}

/**
 * Sends a tool's form. Files go straight from the browser into cloud storage, so size does not
 * matter to our servers, and only their keys travel with the request. If cloud storage is not
 * available the form is sent as it is.
 */
export async function postForm(url: string, fd: FormData): Promise<Response> {
  const files: [string, File][] = [];
  const fields: Record<string, string> = {};
  fd.forEach((v, k) => {
    if (v instanceof File) files.push([k, v]);
    else fields[k] = String(v);
  });
  if (files.length === 0) return fetch(url, { method: "POST", body: fd });

  const total = files.reduce((n, [, f]) => n + f.size, 0) || 1;
  let sent = 0;
  const uploads: Record<string, { key: string; name: string; type: string; size: number }> = {};
  try {
    publish(0);
    for (const [field, file] of files) {
      const type = file.type || "application/octet-stream";
      const res = await fetch("/api/studio/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, type, size: file.size }),
      });
      const j = (await res.json().catch(() => ({}))) as { mode?: string; key?: string; url?: string; error?: string };
      if (!res.ok) return asResponse(j.error ?? "Could not start the upload.", res.status);
      if (j.mode !== "direct" || !j.url || !j.key) return fetch(url, { method: "POST", body: fd });
      try {
        await put(j.url, file, type, (loaded) => publish(Math.min(99, Math.round(((sent + loaded) / total) * 100))));
      } catch {
        // storage refused the browser (not set up for uploads yet): small files can still go the old way
        if (total <= 4 * 1024 * 1024) return fetch(url, { method: "POST", body: fd });
        return asResponse("The upload could not reach storage. Please try again in a moment.");
      }
      sent += file.size;
      uploads[field] = { key: j.key, name: file.name, type, size: file.size };
    }
  } catch {
    return asResponse("The upload was interrupted. Check your connection and try again.");
  } finally {
    publish(null);
  }
  return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields, uploads }) });
}
