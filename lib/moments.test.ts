import { describe, expect, it } from "vitest";
import {
  dayPeriod,
  defaultMomentLocal,
  formatRelative,
  localStringIn,
  momentInstant,
} from "./moments";

const utc = (s: string) => Date.parse(s);

describe("moments", () => {
  it("converts 'tomorrow 3 PM in Karachi' to every zone", () => {
    const t = momentInstant("2026-11-26T15:00", "Asia/Karachi");
    expect(t).toBe(utc("2026-11-26T10:00:00Z"));
    expect(localStringIn(t, "Europe/London")).toBe("2026-11-26T10:00");
    expect(localStringIn(t, "Asia/Kathmandu")).toBe("2026-11-26T15:45");
    expect(localStringIn(t, "America/Los_Angeles")).toBe("2026-11-26T02:00");
    expect(localStringIn(t, "Pacific/Kiritimati")).toBe("2026-11-27T00:00");
  });

  it("classifies local periods", () => {
    const t = momentInstant("2026-11-26T15:00", "Asia/Karachi"); // Thursday
    expect(dayPeriod(t, "Asia/Karachi")).toBe("work");
    expect(dayPeriod(t, "America/Los_Angeles")).toBe("night");
    expect(dayPeriod(t, "Europe/London")).toBe("work");
  });

  it("defaults to the next full hour, or tomorrow morning if late", () => {
    expect(defaultMomentLocal(utc("2026-11-25T10:20:00Z"), "Asia/Karachi")).toBe(
      "2026-11-25T16:00",
    );
    expect(defaultMomentLocal(utc("2026-11-25T17:20:00Z"), "Asia/Karachi")).toBe(
      "2026-11-26T10:00",
    );
  });

  it("formats relative times", () => {
    const now = utc("2026-11-25T10:00:00Z");
    expect(formatRelative(now + 3 * 3600_000, now)).toBe("in 3 hours");
    expect(formatRelative(now - 2 * 86_400_000, now)).toBe("2 days ago");
    expect(formatRelative(now + 10_000, now)).toBe("now");
  });
});
