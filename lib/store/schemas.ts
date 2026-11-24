// zod/mini: same validation engine as Zod 4, tree-shakable functional API
// (much smaller in the client bundle than the classic chainable API).
import * as z from "zod/mini";
import { CITY_BY_ID } from "@/data/cities";

/** Shared Zod schemas for everything read from localStorage, URLs or files. */

export const cityIdSchema = z.string().check(
  z.maxLength(64),
  z.refine((id) => CITY_BY_ID.has(id), "Unknown city"),
);

export const labelSchema = z.string().check(z.trim(), z.maxLength(60));

const timestamp = z.int().check(z.gte(0));

export const cityBookmarkSchema = z.object({
  cityId: cityIdSchema,
  label: z.optional(labelSchema),
  addedAt: timestamp,
});
export type CityBookmark = z.output<typeof cityBookmarkSchema>;

/** Wall-clock "YYYY-MM-DDTHH:mm" in the moment's city zone. */
export const localDateTimeSchema = z
  .string()
  .check(
    z.regex(
      /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d$/,
      "Expected YYYY-MM-DDTHH:mm",
    ),
  );

export const momentNameSchema = z.string().check(z.trim(), z.minLength(1), z.maxLength(80));
export const momentNoteSchema = z.optional(z.string().check(z.trim(), z.maxLength(500)));

export const momentSchema = z.object({
  id: z.string().check(z.minLength(1), z.maxLength(64)),
  name: momentNameSchema,
  note: momentNoteSchema,
  cityId: cityIdSchema,
  local: localDateTimeSchema,
  createdAt: timestamp,
});
export type Moment = z.output<typeof momentSchema>;

/** A moment before it gets an id/createdAt (planner form). */
export const momentDraftSchema = z.omit(momentSchema, { id: true, createdAt: true });

export const settingsSchema = z.object({
  theme: z.enum(["dark", "light"]),
  hour12: z.boolean(),
  showSeconds: z.boolean(),
  showTerminator: z.boolean(),
});
export type Settings = z.output<typeof settingsSchema>;
export const partialSettingsSchema = z.partial(settingsSchema);

/** Export file format. */
export const EXPORT_VERSION = 1;
export const exportFileSchema = z.object({
  app: z.literal("world-clock"),
  version: z.literal(EXPORT_VERSION),
  exportedAt: z.optional(z.string().check(z.maxLength(40))),
  cities: z.array(z.unknown()).check(z.maxLength(500)),
  moments: z.array(z.unknown()).check(z.maxLength(500)),
});

/** Shared-moment URL params: ?city=karachi&at=2026-11-25T15:00&name=…&note=… */
export const shareParamsSchema = z.object({
  city: cityIdSchema,
  at: localDateTimeSchema,
  name: z.optional(z.string().check(z.trim(), z.maxLength(80))),
  note: z.optional(z.string().check(z.trim(), z.maxLength(500))),
});
export type ShareParams = z.output<typeof shareParamsSchema>;

/** Keep valid items, silently drop invalid ones, de-duplicate by key. */
export function parseList<T>(
  input: unknown,
  schema: z.ZodMiniType<T>,
  key: (item: T) => string,
): T[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const raw of input) {
    const r = schema.safeParse(raw);
    if (!r.success) continue;
    const k = key(r.data);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r.data);
  }
  return out;
}
