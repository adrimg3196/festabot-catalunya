import { afterEach, describe, expect, it, vi } from "vitest";
import { getEventByReference, getEvents, isEventReference } from "../src/services/agenda";

const window = {
  start: "2026-07-21T00:00:00.000",
  end: "2026-07-27T23:59:59.999"
};

function officialRow(overrides: Record<string, string> = {}) {
  return {
    source_row_id: "row-k7cm_h6cw~nawu",
    codi: "20260721001",
    denominaci: "Festival Empremtes",
    data_inici: "2026-07-24T00:00:00.000",
    data_fi: "2026-07-24T00:00:00.000",
    municipi: "agenda:ubicacions/barcelona/barcelones/barcelona",
    localitat: "Barcelona",
    latitud: "41.3874",
    longitud: "2.1686",
    tags_mbits: "agenda:ambits/musica",
    tags_categor_es: "agenda:categories/concerts",
    ...overrides
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Agenda Cultural queries", () => {
  it("searches an artist by title without forcing it to be a municipality", async () => {
    let requestedUrl = "";
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      requestedUrl = String(input);
      return Response.json([officialRow()]);
    }));

    const events = await getEvents({ ...window, query: "Empremtes", musicOnly: true, limit: 1000 });
    const where = new URL(requestedUrl).searchParams.get("$where") ?? "";

    expect(events[0]?.title).toBe("Festival Empremtes");
    expect(where).toContain("lower(denominaci) like '%empremtes%'");
    expect(where).toContain("municipi like '%/empremtes'");
    expect(where).toContain(" OR ");
    expect(where).toContain("tags_mbits like '%/musica%'");
  });

  it("keeps nearby searches inside a server-side bounding box", async () => {
    let requestedUrl = "";
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      requestedUrl = String(input);
      return Response.json([officialRow()]);
    }));

    await getEvents({ ...window, latitude: 41.3874, longitude: 2.1686, radiusKm: 30, limit: 1000 });
    const where = new URL(requestedUrl).searchParams.get("$where") ?? "";

    expect(where).toMatch(/latitud between \d+\.\d{6} and \d+\.\d{6}/);
    expect(where).toMatch(/longitud between \d+\.\d{6} and \d+\.\d{6}/);
  });

  it("has a dedicated Festa Major filter and excludes out-of-scope locations", async () => {
    let requestedUrl = "";
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      requestedUrl = String(input);
      return Response.json([officialRow({ denominaci: "Festa Major de Barcelona", tags_mbits: "agenda:ambits/tradicional-i-popular", tags_categor_es: "agenda:categories/festes" })]);
    }));

    await getEvents({ ...window, festaMajorOnly: true });
    const where = new URL(requestedUrl).searchParams.get("$where") ?? "";

    expect(where).toContain("lower(denominaci) like 'festa major%'");
    expect(where).not.toContain("lower(descripcio)");
    expect(where).not.toContain("tags_categor_es like '%/festes%'");
    expect(where).toContain("municipi like 'agenda:ubicacions/barcelona/%'");
  });

  it("keeps listings light and fetches rich program fields with a short cache", async () => {
    const requests: Array<{ url: string; cacheTtl: number | undefined }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const cloudflare = (init as RequestInit & { cf?: { cacheTtl?: number } } | undefined)?.cf;
      requests.push({ url: String(input), cacheTtl: cloudflare?.cacheTtl });
      return Response.json([officialRow({
        descripcio: "Programa complet",
        descripcio_html: "<p>Programa complet</p>"
      })]);
    }));

    await getEvents({ ...window, municipality: "Barcelona" });
    const detail = await getEventByReference("20260721001");
    await getEventByReference("20260721001", { fresh: true });

    const listSelect = new URL(requests[0]?.url ?? "").searchParams.get("$select") ?? "";
    const detailSelect = new URL(requests[1]?.url ?? "").searchParams.get("$select") ?? "";
    expect(listSelect).not.toContain("descripcio");
    expect(detailSelect).toContain("descripcio_html");
    expect(detail?.description).toBe("Programa complet");
    expect(requests.map((request) => request.cacheTtl)).toEqual([300, 60, 0]);
  });

  it("looks up duplicate event locations by the exact Socrata row id", async () => {
    let requestedUrl = "";
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      requestedUrl = String(input);
      return Response.json([officialRow()]);
    }));

    const event = await getEventByReference("row-k7cm_h6cw~nawu");
    const where = new URL(requestedUrl).searchParams.get("$where") ?? "";

    expect(event?.sourceRowId).toBe("row-k7cm_h6cw~nawu");
    expect(where).toContain(":id = 'row-k7cm_h6cw~nawu'");
    expect(where).toContain("agenda:ubicacions/barcelona/%");
    expect(new URL(requestedUrl).searchParams.get("$select")).toContain("descripcio");
    expect(new URL(requestedUrl).searchParams.get("$order")).toBe(":updated_at DESC");
    expect(isEventReference("row-k7cm_h6cw~nawu")).toBe(true);
    expect(isEventReference("row-' OR 1=1")).toBe(false);
  });

  it("rejects failed and malformed upstream responses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("busy", { status: 503 })));
    await expect(getEvents(window)).rejects.toThrow("503");

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ unexpected: true })));
    await expect(getEvents(window)).rejects.toThrow("invalid payload");
  });

  it("does not turn an invalid municipality into a nationwide search", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(getEvents({ ...window, municipality: "!!!" })).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
