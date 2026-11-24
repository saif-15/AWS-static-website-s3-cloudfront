import { shareParamsSchema, type ShareParams } from "./store/schemas";

/** Query string for sharing a moment. */
export function buildShareQuery(p: ShareParams): string {
  const q = new URLSearchParams({ city: p.city, at: p.at });
  if (p.name) q.set("name", p.name);
  if (p.note) q.set("note", p.note);
  return q.toString();
}

/** Parse & validate share params from a query string. Invalid input -> null (never throws). */
export function parseShareQuery(search: string): ShareParams | null {
  let q: URLSearchParams;
  try {
    q = new URLSearchParams(search);
  } catch {
    return null;
  }
  if (!q.has("city") || !q.has("at")) return null;
  const raw = {
    city: q.get("city") ?? undefined,
    at: q.get("at") ?? undefined,
    name: q.get("name") || undefined,
    note: q.get("note") || undefined,
  };
  const r = shareParamsSchema.safeParse(raw);
  return r.success ? r.data : null;
}

/** "2026-11-25T15:00" -> parts */
export function parseLocalDateTime(s: string) {
  const [d = "", t = ""] = s.split("T");
  const [year = 0, month = 1, day = 1] = d.split("-").map(Number);
  const [hour = 0, minute = 0] = t.split(":").map(Number);
  return { year, month, day, hour, minute };
}

export function toLocalDateTimeString(p: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}
