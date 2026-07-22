import { describe, expect, it } from "vitest";
import { addCalendarDays, madridDateString, todayWindow, upcomingWindow, weekendWindow } from "../src/domain/date";

describe("date windows", () => {
  it("uses the Madrid calendar day", () => {
    expect(madridDateString(new Date("2026-07-20T22:30:00Z"))).toBe("2026-07-21");
    expect(todayWindow(new Date("2026-07-20T22:30:00Z"))).toEqual({
      start: "2026-07-21T00:00:00.000",
      end: "2026-07-21T23:59:59.999"
    });
  });

  it("finds the next Friday through Sunday", () => {
    expect(weekendWindow(new Date("2026-07-21T10:00:00Z"))).toEqual({
      start: "2026-07-24T00:00:00.000",
      end: "2026-07-26T23:59:59.999"
    });
  });

  it("keeps the current weekend when already on Saturday", () => {
    expect(weekendWindow(new Date("2026-07-25T10:00:00Z"))).toEqual({
      start: "2026-07-25T00:00:00.000",
      end: "2026-07-26T23:59:59.999"
    });
  });

  it("adds days across month boundaries", () => {
    expect(addCalendarDays("2026-07-31", 1)).toBe("2026-08-01");
  });

  it("builds a bounded window for upcoming Festa Major programs", () => {
    expect(upcomingWindow(3, new Date("2026-07-22T10:00:00Z"))).toEqual({
      start: "2026-07-22T00:00:00.000",
      end: "2026-07-24T23:59:59.999"
    });
  });
});
