// Fixed reference "now" (deterministic across server and client renders).
// We deliberately do NOT use the live clock here — using new Date()/Date.now()
// would produce different ISO timestamps in the server bundle vs. the client
// bundle, which breaks React hydration for any absolute datetime rendered from
// these mock values. A hardcoded constant keeps every render identical.
const NOW_MS = Date.parse("2026-08-28T20:00:00.000Z");

export function minsAgo(mins: number): string {
  return new Date(NOW_MS - mins * 60000).toISOString();
}

export function hrsAgo(hrs: number): string {
  return minsAgo(hrs * 60);
}

export function daysAgo(days: number): string {
  return hrsAgo(days * 24);
}

// Keep an anchor so consumers can derive a deterministic "today/yesterday"
// without touching the live clock. Fixed point relative to NOW_MS.
export function todayISO(): string {
  return daysAgo(0);
}

export function daysAgoISO(days: number): string {
  return daysAgo(days);
}

export function daysAgoDateStr(days: number): string {
  return daysAgo(days).split("T")[0];
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date(NOW_MS);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

  return d.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
