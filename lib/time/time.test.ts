import { describe, expect, it } from "vitest";
import {
  dayDelta,
  findNextTransition,
  formatDifference,
  formatOffset,
  formatSignedDuration,
  formatTime,
  getOffsetMinutes,
  getTimeDifferenceMinutes,
  getZonedParts,
  isDST,
  observesDST,
  splitMeridiem,
  zonedTimeToUtc,
} from "./index";

const utc = (s: string) => Date.parse(s);

describe("offsets: half-hour and 45-minute zones", () => {
  const winter = utc("2026-01-15T12:00:00Z");
  const summer = utc("2026-07-15T12:00:00Z");

  it("Kathmandu is +5:45 all year", () => {
    expect(getOffsetMinutes(winter, "Asia/Kathmandu")).toBe(345);
    expect(getOffsetMinutes(summer, "Asia/Kathmandu")).toBe(345);
    expect(formatOffset(345)).toBe("UTC+5:45");
  });

  it("India is +5:30", () => {
    expect(getOffsetMinutes(winter, "Asia/Kolkata")).toBe(330);
    expect(formatOffset(330)).toBe("UTC+5:30");
  });

  it("Adelaide is +10:30 in southern summer and +9:30 in winter", () => {
    expect(getOffsetMinutes(winter, "Australia/Adelaide")).toBe(630);
    expect(getOffsetMinutes(summer, "Australia/Adelaide")).toBe(570);
  });

  it("Chatham Islands are +13:45 / +12:45", () => {
    expect(getOffsetMinutes(winter, "Pacific/Chatham")).toBe(825);
    expect(getOffsetMinutes(summer, "Pacific/Chatham")).toBe(765);
    expect(formatOffset(825)).toBe("UTC+13:45");
  });

  it("Lord Howe Island shifts by only 30 minutes", () => {
    const jan = getOffsetMinutes(winter, "Australia/Lord_Howe");
    const jul = getOffsetMinutes(summer, "Australia/Lord_Howe");
    expect(jan).toBe(660);
    expect(jul).toBe(630);
    expect(jan - jul).toBe(30);
  });

  it("St. John's is −3:30 / −2:30", () => {
    expect(getOffsetMinutes(winter, "America/St_Johns")).toBe(-210);
    expect(getOffsetMinutes(summer, "America/St_Johns")).toBe(-150);
    expect(formatOffset(-210)).toBe("UTC−3:30");
  });

  it("formats UTC itself", () => {
    expect(formatOffset(0)).toBe("UTC+0");
    expect(getOffsetMinutes(winter, "UTC")).toBe(0);
  });
});

describe("DST transitions", () => {
  it("US spring forward: New York jumps from −5 to −4 on 2026-03-08 at 07:00Z", () => {
    expect(getOffsetMinutes(utc("2026-03-08T06:59:00Z"), "America/New_York")).toBe(-300);
    expect(getOffsetMinutes(utc("2026-03-08T07:00:00Z"), "America/New_York")).toBe(-240);
  });

  it("US fall back: New York returns to −5 on 2026-11-01 at 06:00Z", () => {
    expect(getOffsetMinutes(utc("2026-11-01T05:59:00Z"), "America/New_York")).toBe(-240);
    expect(getOffsetMinutes(utc("2026-11-01T06:00:00Z"), "America/New_York")).toBe(-300);
  });

  it("finds the next transition in both directions (northern hemisphere)", () => {
    const spring = findNextTransition(utc("2026-02-01T00:00:00Z"), "Europe/London");
    expect(spring).toEqual({ at: utc("2026-03-29T01:00:00Z"), fromOffset: 0, toOffset: 60 });
    const autumn = findNextTransition(utc("2026-06-01T00:00:00Z"), "Europe/London");
    expect(autumn).toEqual({ at: utc("2026-10-25T01:00:00Z"), fromOffset: 60, toOffset: 0 });
  });

  it("finds southern-hemisphere transitions (Sydney ends DST in April)", () => {
    const t = findNextTransition(utc("2026-02-01T00:00:00Z"), "Australia/Sydney");
    expect(t?.fromOffset).toBe(660);
    expect(t?.toOffset).toBe(600);
    expect(t?.at).toBe(utc("2026-04-04T16:00:00Z"));
  });

  it("isDST reflects the season in each hemisphere", () => {
    expect(isDST(utc("2026-07-01T12:00:00Z"), "Europe/Paris")).toBe(true);
    expect(isDST(utc("2026-01-01T12:00:00Z"), "Europe/Paris")).toBe(false);
    expect(isDST(utc("2026-01-01T12:00:00Z"), "Australia/Sydney")).toBe(true);
    expect(isDST(utc("2026-07-01T12:00:00Z"), "Australia/Sydney")).toBe(false);
  });

  it("zonedTimeToUtc pushes a non-existent spring-forward time forward", () => {
    // 02:30 on 2026-03-08 doesn't exist in New York.
    const t = zonedTimeToUtc(
      { year: 2026, month: 3, day: 8, hour: 2, minute: 30 },
      "America/New_York",
    );
    const p = getZonedParts(t, "America/New_York");
    expect([p.hour, p.minute]).toEqual([3, 30]);
  });

  it("zonedTimeToUtc picks the earlier instant for an ambiguous fall-back time", () => {
    // 01:30 on 2026-11-01 happens twice in New York; first is EDT (−4).
    const t = zonedTimeToUtc(
      { year: 2026, month: 11, day: 1, hour: 1, minute: 30 },
      "America/New_York",
    );
    expect(t).toBe(utc("2026-11-01T05:30:00Z"));
  });

  it("zonedTimeToUtc round-trips ordinary times in odd-offset zones", () => {
    const t = zonedTimeToUtc(
      { year: 2026, month: 11, day: 25, hour: 15, minute: 0 },
      "Asia/Kathmandu",
    );
    expect(t).toBe(utc("2026-11-25T09:15:00Z"));
  });
});

describe("date-line crossing: Kiribati vs. Samoa vs. Honolulu", () => {
  const t = utc("2026-11-25T10:00:00Z");

  it("Kiritimati (+14) and Honolulu (−10) share a clock time but not a date", () => {
    const kiri = getZonedParts(t, "Pacific/Kiritimati");
    const hnl = getZonedParts(t, "Pacific/Honolulu");
    expect([kiri.hour, kiri.minute]).toEqual([hnl.hour, hnl.minute]);
    expect(kiri.day).toBe(26);
    expect(hnl.day).toBe(25);
    expect(dayDelta(t, "Pacific/Kiritimati", "Pacific/Honolulu")).toBe(1);
    expect(getTimeDifferenceMinutes(t, "Pacific/Kiritimati", "Pacific/Honolulu")).toBe(24 * 60);
  });

  it("Samoa (Apia, +13) is a day ahead of neighbouring American Samoa (−11)", () => {
    expect(getOffsetMinutes(t, "Pacific/Apia")).toBe(780);
    expect(getOffsetMinutes(t, "Pacific/Pago_Pago")).toBe(-660);
    expect(dayDelta(t, "Pacific/Apia", "Pacific/Pago_Pago")).toBe(1);
  });

  it("Kiritimati is the first place into a new day", () => {
    const justAfter = utc("2026-11-25T10:00:00Z");
    expect(getZonedParts(justAfter, "Pacific/Kiritimati").hour).toBe(0);
  });
});

describe("zones without DST", () => {
  it.each([
    "Asia/Karachi",
    "Asia/Tokyo",
    "America/Phoenix",
    "Asia/Kathmandu",
    "Australia/Brisbane",
  ])("%s never observes DST", (zone) => {
    expect(observesDST(2026, zone)).toBe(false);
    expect(isDST(utc("2026-07-01T00:00:00Z"), zone)).toBe(false);
    expect(findNextTransition(utc("2026-01-01T00:00:00Z"), zone, 365)).toBeNull();
  });

  it("Phoenix differs from Denver only in summer", () => {
    expect(
      getTimeDifferenceMinutes(utc("2026-01-15T12:00:00Z"), "America/Phoenix", "America/Denver"),
    ).toBe(0);
    expect(
      getTimeDifferenceMinutes(utc("2026-07-15T12:00:00Z"), "America/Phoenix", "America/Denver"),
    ).toBe(-60);
  });
});

describe("12h / 24h formatting", () => {
  const t = utc("2026-11-25T10:05:09Z"); // 15:05:09 in Karachi (+5)

  it("24h with and without seconds", () => {
    expect(formatTime(t, "Asia/Karachi", { hour12: false, seconds: true })).toBe("15:05:09");
    expect(formatTime(t, "Asia/Karachi", { hour12: false, seconds: false })).toBe("15:05");
  });

  it("12h with and without seconds", () => {
    const withSec = formatTime(t, "Asia/Karachi", { hour12: true, seconds: true });
    expect(splitMeridiem(withSec)).toEqual(["3:05:09", "PM"]);
    const noSec = formatTime(t, "Asia/Karachi", { hour12: true, seconds: false });
    expect(splitMeridiem(noSec)).toEqual(["3:05", "PM"]);
  });

  it("midnight is 00 in 24h and 12 AM in 12h", () => {
    const midnight = utc("2026-11-25T00:00:00Z");
    expect(formatTime(midnight, "UTC", { hour12: false, seconds: false })).toBe("00:00");
    expect(splitMeridiem(formatTime(midnight, "UTC", { hour12: true, seconds: false }))).toEqual([
      "12:00",
      "AM",
    ]);
  });

  it("30/45-minute zones format correctly", () => {
    expect(formatTime(t, "Asia/Kathmandu", { hour12: false, seconds: false })).toBe("15:50");
    expect(formatTime(t, "Asia/Kolkata", { hour12: false, seconds: false })).toBe("15:35");
  });
});

describe("difference formatting", () => {
  it("describes ahead/behind/same", () => {
    expect(formatDifference(345)).toBe("5h 45m ahead");
    expect(formatDifference(-180)).toBe("3h behind");
    expect(formatDifference(30)).toBe("30m ahead");
    expect(formatDifference(0)).toBe("Same time as you");
  });

  it("formats signed durations", () => {
    expect(formatSignedDuration(345)).toBe("+5h 45m");
    expect(formatSignedDuration(-210)).toBe("−3h 30m");
    expect(formatSignedDuration(0)).toBe("±0");
  });
});
