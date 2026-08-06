import { afterEach, describe, expect, it, vi } from "vitest";
import { app } from "../src/index";

const secret = "configure-shared-secret";
const env = {
  PROGRAM_SYNC_SECRET: secret,
  TELEGRAM_BOT_TOKEN: "bot-token",
  TELEGRAM_WEBHOOK_SECRET: "webhook-secret"
} as unknown as Parameters<typeof app.request>[1];

afterEach(() => vi.unstubAllGlobals());

describe("/internal/configure", () => {
  it("rejects wrong secret with 403", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: true })));
    const res = await app.request("/internal/configure", {
      method: "POST",
      headers: { Authorization: `Bearer wrong` }
    }, env);
    expect(res.status).toBe(403);
  });

  it("calls setMyCommands and setWebhook when secret matches", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input).split("/").at(-1) ?? "");
      return Response.json({ ok: true, result: true });
    }));
    const res = await app.request("/internal/configure", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` }
    }, env);
    expect(res.status).toBe(200);
    expect(calls).toContain("setMyCommands");
    expect(calls).toContain("setWebhook");
  });
});
