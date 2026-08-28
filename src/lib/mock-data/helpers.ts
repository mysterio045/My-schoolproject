const now = new Date();

export function minsAgo(mins: number): string {
  return new Date(now.getTime() - mins * 60000).toISOString();
}

export function hrsAgo(hrs: number): string {
  return minsAgo(hrs * 60);
}

export function daysAgo(days: number): string {
  return hrsAgo(days * 24);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
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
