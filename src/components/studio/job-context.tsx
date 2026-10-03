"use client";

import * as React from "react";
import { JobModal } from "@/components/studio/job-modal";
import type { JobState } from "@/components/studio/use-job";

export type JobView = { state: JobState; stop: () => void } | null;

const Publish = React.createContext<(v: JobView) => void>(() => {});

/** Lets a tool form tell the page what its job is doing, so one progress window serves every tool. */
export const useJobPublisher = () => React.useContext(Publish);

export function JobHost({ children }: { children: React.ReactNode }) {
  const [view, setView] = React.useState<JobView>(null);
  return (
    <Publish.Provider value={setView}>
      {children}
      <JobModal view={view} />
    </Publish.Provider>
  );
}
