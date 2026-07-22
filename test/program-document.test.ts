import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOfficialProgramDocument } from "../src/services/program-document";
import type { Env, EventItem } from "../src/types";

const first = vi.fn();
const bind = vi.fn(() => ({ first }));
const prepare = vi.fn(() => ({ bind }));
const env = { DB: { prepare } } as unknown as Env;

const event: EventItem = {
  code: "2026071300004",
  title: "Festa Major de Blanes",
  startsAt: "2026-07-22T00:00:00.000",
  endsAt: "2026-07-27T00:00:00.000",
  municipality: "Blanes",
  municipalitySlug: "blanes",
  comarca: "Selva",
  categories: ["festes"],
  sourceUpdatedAt: "2026-07-13T07:19:00.000Z",
  programDocumentUrls: ["https://www.blanes.cat/programa-2026.pdf"]
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("preprocessed official programs", () => {
  it("loads the exact official PDF revision from D1", async () => {
    first.mockResolvedValue({
      source_url: "https://www.blanes.cat/programa-2026.pdf",
      text: "Dimecres 22\n19.30 h PREGÓ DE FESTA MAJOR"
    });

    const result = await getOfficialProgramDocument(env, event, { fresh: true });

    expect(bind).toHaveBeenCalledWith(
      "2026071300004",
      "https://www.blanes.cat/programa-2026.pdf",
      "2026-07-13T07:19:00.000Z"
    );
    expect(result?.text).toContain("19.30 h PREGÓ");
  });

  it("does not perform a query when the source has no official document", async () => {
    await expect(getOfficialProgramDocument(env, { ...event, programDocumentUrls: undefined })).resolves.toBeNull();
    expect(prepare).not.toHaveBeenCalled();
  });
});
