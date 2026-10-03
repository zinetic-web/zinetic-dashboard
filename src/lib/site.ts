/** Where the public website (pricing and checkout) lives. Falls back to the current domain. */
const base = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

/** The checkout page, optionally opened on a service. */
export function checkoutUrl(service?: string) {
  return `${base()}/checkout${service ? `?service=${encodeURIComponent(service)}` : ""}`;
}

/** The client login page, where a customer chooses which dashboard to open. */
export function clientLoginUrl() {
  return `${base()}/client-login`;
}
