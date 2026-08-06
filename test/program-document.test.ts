import { afterEach, describe, expect, it, vi } from "vitest";
import { getOfficialProgramDocument } from "../src/services/program-document";
import type { Env, EventItem } from "../src/types";

const event: EventItem = {
  code: "2025071300001", municipalitySlug: "blanes", municipality: "Blanes", comarca: "Selva",
  title: "Festa Major", startsAt: "2026-08-10T00:00:00.000", endsAt: "2026-08-15T23:59:59.999",
  categories: [], sourceUpdatedAt: "2026-07-01T00:00:00.000Z", programDocumentUrls: ["https://x/programa.pdf"]
};

// Socrata-shaped row (mirrors test/agenda.test.ts officialRow) so getEventByReference
// normalizes it into an EventItem; getOfficialProgramDocument reads source_updated_at from it.
function officialRow(overrides: Record<string, string> = {}) {
  return {
    source_row_id: "row-k7cm_h6cw~nawu",
    codi: "2025071300001",
    denominaci: "Festa Major de Blanes",
    data_inici: "2026-08-10T00:00:00.000",
    data_fi: "2026-08-15T23:59:59.999",
    municipi: "agenda:ubicacions/girona/selva/blanes",
    localitat: "Blanes",
    ...overrides
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getOfficialProgramDocument fresh", () => {
  it("queries D1 with the freshly read source_updated_at when fresh=true", async () => {
    const seen: string[] = [];
    const env = {
      DB: { prepare: (sql: string) => ({ bind: (_c: string, _u: string, ua: string) => {
        seen.push(ua);
        return { first: async () => ({ source_url: "https://x/programa.pdf", text: "text", extracted_at: "2026-08-06T10:00:00.000Z" }) };
      } }) }
    } as unknown as Env;
    vi.stubGlobal("fetch", vi.fn(async () => Response.json([officialRow({ source_updated_at: "2026-08-05T00:00:00.000Z" })])));
    const doc = await getOfficialProgramDocument(env, event, { fresh: true });
    expect(doc).not.toBeNull();
    expect(seen).toContain("2026-08-05T00:00:00.000Z");
  });
});
