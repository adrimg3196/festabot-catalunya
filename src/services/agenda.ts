import { normalizeEvent, municipalitySlug, rankEvents, type RankContext } from "../domain/events";
import type { EventItem, SocrataEvent } from "../types";

const DATASET_ENDPOINT = "https://analisi.transparenciacatalunya.cat/resource/rhpv-yr4f.json";
const SELECT_FIELDS = [
  ":id as source_row_id",
  ":updated_at as source_updated_at",
  "codi",
  "denominaci",
  "data_inici",
  "data_fi",
  "data_creacio",
  "horari",
  "gratuita",
  "municipi",
  "comarca",
  "localitat",
  "espai",
  "adre_a",
  "latitud",
  "longitud",
  "tags_mbits",
  "tags_categor_es",
  "urlactivitat",
  "url",
  "enllac1_url",
  "linkbotoentrades",
  "entrades"
].join(",");

export interface AgendaQuery extends RankContext {
  municipality?: string;
  musicOnly?: boolean;
  limit?: number;
}

function escapeLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

export async function getEvents(query: AgendaQuery): Promise<EventItem[]> {
  const conditions = [
    `data_inici <= '${escapeLiteral(query.end)}'`,
    `data_fi >= '${escapeLiteral(query.start)}'`
  ];

  if (query.municipality) {
    const slug = municipalitySlug(query.municipality);
    if (slug) conditions.push(`municipi like '%/${escapeLiteral(slug)}'`);
  }

  if (query.musicOnly) {
    conditions.push("(tags_mbits like '%musica%' OR tags_categor_es like '%concerts%' OR tags_categor_es like '%festes%' OR tags_categor_es like '%festivals%')");
  }

  const params = new URLSearchParams({
    "$select": SELECT_FIELDS,
    "$where": conditions.join(" AND "),
    "$order": "data_creacio DESC",
    "$limit": String(Math.min(Math.max(query.limit ?? 500, 1), 1000))
  });
  const response = await fetch(`${DATASET_ENDPOINT}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cf: { cacheEverything: true, cacheTtl: 900 }
  });

  if (!response.ok) {
    throw new Error(`Agenda API returned ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("Agenda API returned an invalid payload");
  }

  const normalized = (payload as SocrataEvent[])
    .map(normalizeEvent)
    .filter((event): event is EventItem => event !== null);
  return rankEvents(normalized, query);
}

export function isEventReference(value: string): boolean {
  return /^(?:\d{5,20}|row-[A-Za-z0-9._~-]{5,50})$/.test(value);
}

export async function getEventByReference(reference: string): Promise<EventItem | null> {
  if (!isEventReference(reference)) return null;
  const where = reference.startsWith("row-")
    ? `:id = '${escapeLiteral(reference)}'`
    : `codi = ${reference}`;
  const params = new URLSearchParams({
    "$select": SELECT_FIELDS,
    "$where": where,
    "$limit": "20"
  });
  const response = await fetch(`${DATASET_ENDPOINT}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cf: { cacheEverything: true, cacheTtl: 1800 }
  });
  if (!response.ok) throw new Error(`Agenda API returned ${response.status}`);
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) return null;
  return (payload as SocrataEvent[]).map(normalizeEvent).find((event): event is EventItem => event !== null) ?? null;
}

export const agendaSourceUrl = "https://agenda.cultura.gencat.cat/";
