"use client";

import * as React from "react";

type Mode = "datetime" | "short" | "date";

const OPTIONS: Record<Mode, Intl.DateTimeFormatOptions> = {
  datetime: { dateStyle: "medium", timeStyle: "short" },
  short: { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
  date: { day: "numeric", month: "short", year: "numeric" },
};

const noop = () => () => {};

/**
 * A date and time in the visitor's own time zone. Servers run on UTC, so a time formatted on the
 * server is wrong for almost everyone. The server draws it in UTC, labelled, and the browser
 * replaces it with local time as soon as the page loads.
 */
export function LocalTime({ iso, mode = "datetime" }: { iso: string; mode?: Mode }) {
  const text = React.useSyncExternalStore(
    noop,
    () => new Date(iso).toLocaleString(undefined, OPTIONS[mode]),
    () => `${new Date(iso).toLocaleString("en-US", { ...OPTIONS[mode], timeZone: "UTC" })} UTC`
  );
  return <span suppressHydrationWarning>{text}</span>;
}
