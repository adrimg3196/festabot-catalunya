import { normalizeEvent, municipalitySlug, rankEvents, type RankContext } from "../domain/events";
import type { EventItem, SocrataEvent } from "../types";

const DATASET_ENDPOINT = "https://analisi.transparenciacatalunya.cat/resource/rhpv-yr4f.json";
const CATALONIA_CONDITION = "(municipi like 'agenda:ubicacions/barcelona/%' OR municipi like 'agenda:ubicacions/girona/%' OR municipi like 'agenda:ubicacions/lleida/%' OR municipi like 'agenda:ubicacions/tarragona/%')";
const BASE_SELECT_FIELD_NAMES = [
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
];
const BASE_SELECT_FIELDS = BASE_SELECT_FIELD_NAMES.join(",");
const DETAIL_SELECT_FIELDS = [
  ...BASE_SELECT_FIELD_NAMES,
  "subt_tol",
  "descripcio",
  "descripcio_html",
  "documents"
].join(",");

export interface AgendaQuery extends RankContext {
  municipality?: string;
  musicOnly?: boolean;
  festiveOnly?: boolean;
  festaMajorOnly?: boolean;
  fresh?: boolean;
  limit?: number;
}

function escapeLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function validLatitude(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value >= -90 && value <= 90;
}

function validLongitude(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value >= -180 && value <= 180;
}

export async function getEvents(query: AgendaQuery): Promise<EventItem[]> {
  const conditions = [
    `data_inici <= '${escapeLiteral(query.end)}'`,
    `data_fi >= '${escapeLiteral(query.start)}'`,
    CATALONIA_CONDITION
  ];

  if (query.municipality) {
    const slug = municipalitySlug(query.municipality);
    if (!slug) return [];
    conditions.push(`municipi like '%/${escapeLiteral(slug)}'`);
  }

  if (query.query) {
    const search = query.query.trim().toLocaleLowerCase("ca-ES").slice(0, 80);
    const slug = municipalitySlug(search);
    if (search) {
      const literal = escapeLiteral(search);
      const textConditions = [
        `lower(denominaci) like '%${literal}%'`,
        `lower(localitat) like '%${literal}%'`,
        `lower(espai) like '%${literal}%'`
      ];
      if (slug) textConditions.push(`municipi like '%/${escapeLiteral(slug)}'`);
      conditions.push(`(${textConditions.join(" OR ")})`);
    }
  }

  if (query.musicOnly) {
    conditions.push("(tags_mbits like '%/musica%' OR tags_categor_es like '%/concerts%')");
  }

  if (query.festaMajorOnly) {
    conditions.push("(lower(denominaci) like 'festa major%' OR lower(denominaci) like 'festes majors%' OR lower(denominaci) like 'la festa major%' OR lower(denominaci) like 'fiesta mayor%' OR lower(denominaci) like '% - festa major%' OR lower(denominaci) like '% – festa major%' OR lower(denominaci) like 'les santes%' OR lower(denominaci) like 'festes de la mercè%')");
  } else if (query.festiveOnly) {
    conditions.push("(lower(denominaci) like '%festa major%' OR lower(denominaci) like '%fiesta mayor%' OR tags_categor_es like '%/festes%')");
  }

  if (validLatitude(query.latitude) && validLongitude(query.longitude)) {
    const radiusKm = Math.min(Math.max(query.radiusKm ?? 25, 1), 100);
    const coarseLatitude = Math.round(query.latitude * 100) / 100;
    const coarseLongitude = Math.round(query.longitude * 100) / 100;
    const latitudeDelta = radiusKm / 110.574;
    const longitudeDelta = radiusKm / Math.max(11.132, 111.32 * Math.cos(coarseLatitude * Math.PI / 180));
    const minLatitude = Math.max(-90, coarseLatitude - latitudeDelta).toFixed(6);
    const maxLatitude = Math.min(90, coarseLatitude + latitudeDelta).toFixed(6);
    const minLongitude = Math.max(-180, coarseLongitude - longitudeDelta).toFixed(6);
    const maxLongitude = Math.min(180, coarseLongitude + longitudeDelta).toFixed(6);
    conditions.push(`latitud between ${minLatitude} and ${maxLatitude}`);
    conditions.push(`longitud between ${minLongitude} and ${maxLongitude}`);
  }

  const params = new URLSearchParams({
    "$select": BASE_SELECT_FIELDS,
    "$where": conditions.join(" AND "),
    "$order": query.festaMajorOnly ? "data_inici ASC, :updated_at DESC" : "data_creacio DESC",
    "$limit": String(Math.min(Math.max(query.limit ?? 500, 1), 1000))
  });
  const response = await fetch(`${DATASET_ENDPOINT}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cf: { cacheEverything: true, cacheTtl: query.fresh ? 0 : 300 },
    signal: AbortSignal.timeout(6_000)
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

export async function getEventByReference(
  reference: string,
  options: { fresh?: boolean } = {}
): Promise<EventItem | null> {
  if (!isEventReference(reference)) return null;
  const referenceCondition = reference.startsWith("row-")
    ? `:id = '${escapeLiteral(reference)}'`
    : `codi = ${reference}`;
  const where = `${referenceCondition} AND ${CATALONIA_CONDITION}`;
  const params = new URLSearchParams({
    "$select": DETAIL_SELECT_FIELDS,
    "$where": where,
    "$order": ":updated_at DESC",
    "$limit": "20"
  });
  const response = await fetch(`${DATASET_ENDPOINT}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cf: { cacheEverything: true, cacheTtl: options.fresh ? 0 : 60 },
    signal: AbortSignal.timeout(6_000)
  });
  if (!response.ok) throw new Error(`Agenda API returned ${response.status}`);
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) return null;
  return (payload as SocrataEvent[]).map(normalizeEvent).find((event): event is EventItem => event !== null) ?? null;
}

export const agendaSourceUrl = "https://agenda.cultura.gencat.cat/";
