// Shared limits for the live tools. They live here, not in the route files, because a route file may only export handlers.

/** One live transcription session may run this long. It is paid for up front and what was not used is given back. */
export const LIVE_MAX_SECONDS = 15 * 60;

/** One conversation with a voice agent may run this long, with the same up-front payment and refund. */
export const SESSION_MAX_SECONDS = 10 * 60;

/** How many voice agents a customer can keep. */
export const MAX_AGENTS = 5;
