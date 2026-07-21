const MADRID_TIME_ZONE = "Europe/Madrid";

export interface DateWindow {
  start: string;
  end: string;
}

export function madridDateString(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MADRID_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function addCalendarDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error("Invalid ISO date");
  }

  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function todayWindow(now = new Date()): DateWindow {
  const day = madridDateString(now);
  return {
    start: `${day}T00:00:00.000`,
    end: `${day}T23:59:59.999`
  };
}

export function nextSevenDaysWindow(now = new Date()): DateWindow {
  const startDay = madridDateString(now);
  const endDay = addCalendarDays(startDay, 6);
  return {
    start: `${startDay}T00:00:00.000`,
    end: `${endDay}T23:59:59.999`
  };
}

export function weekendWindow(now = new Date()): DateWindow {
  const today = madridDateString(now);
  const [year, month, day] = today.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error("Invalid current date");
  }

  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  let startOffset: number;
  let endOffset: number;

  if (weekday === 5) {
    startOffset = 0;
    endOffset = 2;
  } else if (weekday === 6) {
    startOffset = 0;
    endOffset = 1;
  } else if (weekday === 0) {
    startOffset = 0;
    endOffset = 0;
  } else {
    startOffset = 5 - weekday;
    endOffset = startOffset + 2;
  }

  return {
    start: `${addCalendarDays(today, startOffset)}T00:00:00.000`,
    end: `${addCalendarDays(today, endOffset)}T23:59:59.999`
  };
}

export function formatDateRange(start: string, end: string, language: "ca" | "es"): string {
  const locale = language === "ca" ? "ca-ES" : "es-ES";
  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: MADRID_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short"
  });
  const startDate = new Date(`${start.slice(0, 10)}T12:00:00Z`);
  const endDate = new Date(`${end.slice(0, 10)}T12:00:00Z`);
  const first = formatter.format(startDate);
  const second = formatter.format(endDate);
  return start.slice(0, 10) === end.slice(0, 10) ? first : `${first} – ${second}`;
}

export function reminderTimeFor(start: string, now = new Date()): string {
  const eventDay = start.slice(0, 10);
  const previousDay = addCalendarDays(eventDay, -1);
  const previousEveningUtc = new Date(`${previousDay}T18:00:00.000Z`);
  if (previousEveningUtc.getTime() > now.getTime()) {
    return previousEveningUtc.toISOString();
  }
  return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
}

