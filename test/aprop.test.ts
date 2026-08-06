import { describe, expect, it } from "vitest";
import { getUserPreferences } from "../src/repositories/users";
import type { Env } from "../src/types";

const stored: Record<string, { home_municipality?: string; radius_km?: number }> = {
  "7": { home_municipality: "blanes", radius_km: 15 }
};
const env = {
  DB: { prepare: () => ({ bind: () => ({ first: async () => stored["7"] ?? null, run: async () => {} }) }) }
} as unknown as Env;

describe("aprop preferences", () => {
  it("reads persisted home and radius", async () => {
    const prefs = await getUserPreferences(env, 7);
    expect(prefs.homeMunicipality).toBe("blanes");
    expect(prefs.radiusKm).toBe(15);
  });
});
