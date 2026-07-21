import { afterEach, describe, expect, it, vi } from "vitest";
import { answerInlineQuery, sendMessage, TelegramApiError } from "../src/services/telegram";
import type { Env } from "../src/types";

const env = { TELEGRAM_BOT_TOKEN: "test-token" } as Env;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Telegram API boundary", () => {
  it("keeps inline results personal and short-lived", async () => {
    let payload: Record<string, unknown> = {};
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({ ok: true, result: true });
    }));

    await answerInlineQuery(env, "inline-1", [], "12");

    expect(payload).toMatchObject({ is_personal: true, cache_time: 60, next_offset: "12" });
  });

  it("falls back to valid plain HTML instead of cutting a tag", async () => {
    let payload: Record<string, unknown> = {};
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({ ok: true, result: { message_id: 1 } });
    }));

    await sendMessage(env, 1, `<b>${"x".repeat(5000)}</b>`);
    const text = String(payload.text);

    expect(text.length).toBeLessThanOrEqual(4096);
    expect(text).not.toContain("<b>");
    expect(text.endsWith("…")).toBe(true);
  });

  it("preserves Telegram retry metadata on API errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      ok: false,
      error_code: 429,
      description: "Too Many Requests",
      parameters: { retry_after: 17 }
    }, { status: 429 })));

    const error = await sendMessage(env, 1, "hola").catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(TelegramApiError);
    expect((error as TelegramApiError).errorCode).toBe(429);
    expect((error as TelegramApiError).retryAfterSeconds).toBe(17);
  });
});
