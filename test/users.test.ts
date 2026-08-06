import { describe, expect, it } from "vitest";
import { setHomeMunicipality, getUserPreferences } from "../src/repositories/users";
import type { Env } from "../src/types";

function makeEnv(row: { home_municipality?: string; radius_km?: number } | null): Env {
  return {
    DB: {
      prepare: () => ({
        bind: () => ({
          run: async () => {},
          first: async () => row,
        }),
      }),
    },
  } as unknown as Env;
}

describe("setHomeMunicipality", () => {
  it("persists municipality via upsert", async () => {
    const calls: Array<{ sql: string; args: unknown[] }> = [];
    const env = {
      DB: {
        prepare: (sql: string) => ({
          bind: (...args: unknown[]) => {
            calls.push({ sql, args });
            return { run: async () => {}, first: async () => null };
          },
        }),
      },
    } as unknown as Env;
    await setHomeMunicipality(env, 123, "blanes");
    expect(calls[0]!.sql).toContain("home_municipality");
    expect(calls[0]!.args[1]).toBe("blanes");
  });
});

describe("getUserPreferences", () => {
  it("returns default radius 25 when unset", async () => {
    const prefs = await getUserPreferences(makeEnv(null), 123);
    expect(prefs.radiusKm).toBe(25);
    expect(prefs.homeMunicipality).toBeUndefined();
  });

  it("clamps radius above 100", async () => {
    expect((await getUserPreferences(makeEnv({ radius_km: 200 }), 1)).radiusKm).toBe(100);
  });

  it("clamps radius below 5", async () => {
    expect((await getUserPreferences(makeEnv({ radius_km: 0 }), 1)).radiusKm).toBe(5);
  });

  it("falls back to 25 on invalid radius", async () => {
    expect((await getUserPreferences(makeEnv({ radius_km: NaN }), 1)).radiusKm).toBe(25);
  });

  it("returns stored home municipality and radius", async () => {
    const prefs = await getUserPreferences(makeEnv({ home_municipality: "blanes", radius_km: 15 }), 1);
    expect(prefs.homeMunicipality).toBe("blanes");
    expect(prefs.radiusKm).toBe(15);
  });
});
