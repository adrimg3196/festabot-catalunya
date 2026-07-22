import { describe, expect, it } from "vitest";
import { formatSourceUpdatedAt, isFestaMajor, programPages } from "../src/domain/program";
import type { EventItem } from "../src/types";

function festa(overrides: Partial<EventItem> = {}): EventItem {
  return {
    code: "2026071300004",
    title: "Festa Major de Blanes",
    startsAt: "2026-07-22T00:00:00.000",
    endsAt: "2026-07-27T00:00:00.000",
    municipality: "Blanes",
    municipalitySlug: "blanes",
    comarca: "Selva",
    venue: "Diferents espais",
    categories: ["festes"],
    sourceUpdatedAt: "2026-07-22T07:37:14.017Z",
    ...overrides
  };
}

describe("in-chat Festa Major programs", () => {
  it("renders the published program directly and escapes official text", () => {
    const pages = programPages(festa({
      description: "Dimecres 22: Pregó <central> & concerts.\n• Dijous 23: Correfoc."
    }), "ca", new Date("2026-07-22T08:00:00.000Z"));

    expect(pages).toHaveLength(1);
    expect(pages[0]).toContain("Resum oficial publicat");
    expect(pages[0]).toContain("Pregó &lt;central&gt; &amp; concerts");
    expect(pages[0]).toContain("font actualitzada");
    expect(pages[0]).toContain("Font oficial: Agenda Cultural de Catalunya");
  });

  it("paginates long programs without exceeding Telegram's message limit", () => {
    const description = Array.from({ length: 500 }, (_, index) => `Acte ${index + 1} <&> a les 22.00 h.`).join("\n");
    const pages = programPages(festa({ description }), "es", new Date("2026-07-22T08:00:00.000Z"));

    expect(pages.length).toBeGreaterThan(2);
    expect(pages.every((page) => page.length <= 4096)).toBe(true);
    expect(pages.join("\n")).toContain("Acte 1 &lt;&amp;&gt;");
    expect(pages.join("\n")).toContain("Acte 500 &lt;&amp;&gt;");
  });

  it("states when the detailed program is not yet published", () => {
    const page = programPages(festa({ description: undefined, schedule: undefined }), "es", new Date("2026-07-22T08:00:00.000Z"))[0];
    expect(page).toContain("todavía no ha publicado el programa detallado");
  });

  it("labels extracted PDF text as the official program", () => {
    const pages = programPages(
      festa({ description: "Resum curt." }),
      "ca",
      new Date("2026-07-22T08:00:00.000Z"),
      { sourceUrl: "https://blanes.cat/programa.pdf", text: "Dimecres 22\n19.30 h Pregó\n22.00 h Correfoc" }
    );
    expect(pages[0]).toContain("Programa oficial");
    expect(pages[0]).toContain("19.30 h Pregó");
    expect(pages[0]).not.toContain("Resum curt");
  });

  it("recognizes Festa Major records and ignores invalid update dates", () => {
    expect(isFestaMajor(festa())).toBe(true);
    expect(isFestaMajor(festa({ title: "Concert d'estiu", description: "Una activitat musical" }))).toBe(false);
    expect(isFestaMajor(festa({ title: "Los Diablos", description: "Concert de Festa Major" }))).toBe(false);
    expect(formatSourceUpdatedAt("not-a-date", "ca")).toBeUndefined();
  });
});
