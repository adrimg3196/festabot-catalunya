import { describe, expect, it } from "vitest";
import { isValidProgramSync, isValidUpdate } from "../src/index";
import type { TelegramUpdate } from "../src/types";

function callbackUpdate(data: string): TelegramUpdate {
  return {
    update_id: 1,
    callback_query: {
      id: "callback-1",
      from: { id: 42 },
      data
    }
  };
}

describe("Telegram update validation", () => {
  it("enforces callback_data as 64 UTF-8 bytes rather than characters", () => {
    expect(isValidUpdate(callbackUpdate("a".repeat(64)))).toBe(true);
    expect(isValidUpdate(callbackUpdate("a".repeat(65)))).toBe(false);
    expect(isValidUpdate(callbackUpdate("🎉".repeat(16)))).toBe(true);
    expect(isValidUpdate(callbackUpdate("🎉".repeat(17)))).toBe(false);
  });
});

describe("official program sync validation", () => {
  const valid = {
    eventCode: "2026071300004",
    sourceUrl: "https://www.blanes.cat/programa-2026.pdf",
    sourceUpdatedAt: "2026-07-13T07:19:00.000Z",
    text: "Programa oficial ".repeat(20)
  };

  it("accepts bounded official PDF content and rejects unsafe sources", () => {
    expect(isValidProgramSync(valid)).toBe(true);
    expect(isValidProgramSync({ ...valid, eventCode: "1 OR 1=1" })).toBe(false);
    expect(isValidProgramSync({ ...valid, sourceUrl: "http://127.0.0.1/programa.pdf" })).toBe(false);
    expect(isValidProgramSync({ ...valid, sourceUrl: "https://example.cat/programa.html" })).toBe(false);
    expect(isValidProgramSync({ ...valid, text: "massa curt" })).toBe(false);
  });
});
