import { describe, expect, it, vi } from "vitest";
import app from "../src/index";

// Stub the Cloudflare bindings the sync endpoint touches, so we exercise the
// real HTTP auth path (the `Bearer` scheme that regressed in sync-programs.mjs)
// without a live D1 instance.
function mockEnv() {
  const inserts: unknown[] = [];
  return {
    env: {
      DB: {
        prepare: () => ({
          bind: () => ({
            run: () => {
              inserts.push({});
              return Promise.resolve({});
            }
          })
        })
      },
      USER_RATE_LIMITER: { limit: () => Promise.resolve({ success: true }) },
      PROGRAM_SYNC_SECRET: "test-secret"
    },
    inserts
  };
}

const validPayload = {
  eventCode: "2026071300004",
  sourceUrl: "https://www.blanes.cat/programa-2026.pdf",
  sourceUpdatedAt: "2026-07-13T07:19:00.000Z",
  text: "Programa oficial ".repeat(20)
};

function post(env: ReturnType<typeof mockEnv>["env"], body: unknown, authorization: string) {
  return app.fetch(new Request("https://festabot/internal/programs/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authorization
    },
    body: JSON.stringify(body)
  }), env);
}

describe("program sync endpoint auth", () => {
  it("rejects requests without the Bearer scheme (regression guard for sync bug)", async () => {
    const { env } = mockEnv();
    const response = await post(env, validPayload, "*** test-secret");
    expect(response.status).toBe(403);
  });

  it("accepts requests carrying the Bearer token and stores the document", async () => {
    const { env, inserts } = mockEnv();
    const response = await post(env, validPayload, "Bearer test-secret");
    expect(response.status).toBe(200);
    expect(inserts.length).toBe(1);
  });

  it("rejects an empty secret config with 404", async () => {
    const { env } = mockEnv();
    const response = await app.fetch(new Request("https://festabot/internal/programs/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer anything" }
    }), { ...env, PROGRAM_SYNC_SECRET: "" });
    expect(response.status).toBe(404);
  });
});
