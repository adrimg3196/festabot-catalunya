import type { EventItem, Language, SocrataEvent } from "../types";

const FESTIVE_TERMS = /concert|música|musica|festa|festes|festival|dj|orquestra|correfoc|revetlla/i;

export interface RankContext {
  start: string;
  end: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  query?: string;
}

function slugTail(value?: string): string {
  if (!value) return "";
  const parts = value.split("/").filter(Boolean);
  return parts.at(-1) ?? "";
}

export function humanizeSlug(value: string): string {
  const smallWords = new Set(["de", "del", "d", "la", "les", "el", "els", "i"]);
  return value
    .split("-")
    .filter(Boolean)
    .map((word, index) => {
      if (index > 0 && smallWords.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function safeCoordinate(value?: string): number | undefined {
  if (!value) return undefined;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : undefined;
}

function safeUrl(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (!value) continue;
    try {
      const parsed = new URL(value);
      if (parsed.protocol === "https:") return parsed.toString();
    } catch {
      // Ignore malformed external URLs.
    }
  }
  return undefined;
}

export function normalizeEvent(raw: SocrataEvent): EventItem | null {
  if (!raw.codi || !/^\d{5,20}$/.test(raw.codi) || !raw.denominaci || !raw.data_inici || !raw.data_fi) {
    return null;
  }

  const municipalitySlug = slugTail(raw.municipi);
  const comarcaSlug = slugTail(raw.comarca);
  const categories = `${raw.tags_mbits ?? ""},${raw.tags_categor_es ?? ""}`
    .split(",")
    .map(slugTail)
    .filter(Boolean);

  return {
    sourceRowId: raw.source_row_id,
    sourceUpdatedAt: raw.source_updated_at,
    code: raw.codi,
    title: raw.denominaci.trim(),
    startsAt: raw.data_inici,
    endsAt: raw.data_fi,
    schedule: raw.horari?.trim() || undefined,
    free: raw.gratuita ? /^(sí|si|yes)$/i.test(raw.gratuita.trim()) : undefined,
    municipality: raw.localitat?.trim() || humanizeSlug(municipalitySlug),
    municipalitySlug,
    comarca: humanizeSlug(comarcaSlug),
    venue: raw.espai?.trim() || undefined,
    address: raw.adre_a?.trim() || undefined,
    latitude: safeCoordinate(raw.latitud),
    longitude: safeCoordinate(raw.longitud),
    categories,
    sourceUrl: safeUrl(raw.urlactivitat, raw.url, raw.enllac1_url, raw.linkbotoentrades)
      ?? `https://agenda.cultura.gencat.cat/content/agenda/ca/activitat.html/${raw.codi}/x`,
    ticketInfo: raw.entrades?.trim() || undefined
  };
}

export function municipalitySlug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, "")
    .replace(/[\s']+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function durationDays(event: EventItem): number {
  const start = Date.parse(event.startsAt);
  const end = Date.parse(event.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 9999;
  return Math.max(0, (end - start) / 86_400_000);
}

function isFestive(event: EventItem): boolean {
  return FESTIVE_TERMS.test(`${event.title} ${event.categories.join(" ")}`);
}

export function rankEvents(events: EventItem[], context: RankContext): EventItem[] {
  const startMs = Date.parse(context.start);
  const endMs = Date.parse(context.end);
  const normalizedQuery = context.query?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  return events
    .flatMap((event) => {
      const eventStart = Date.parse(event.startsAt);
      const eventEnd = Date.parse(event.endsAt);
      const year = Number(event.endsAt.slice(0, 4));
      if (!Number.isFinite(eventStart) || !Number.isFinite(eventEnd) || year > 2100) return [];
      if (eventStart > endMs || eventEnd < startMs) return [];

      let score = 0;
      if (eventStart >= startMs && eventStart <= endMs) score += 45;
      if (isFestive(event)) score += 35;
      if (event.free) score += 8;
      const span = durationDays(event);
      if (span <= 7) score += 20;
      else if (span > 60) score -= 25;

      if (normalizedQuery) {
        const haystack = `${event.title} ${event.municipality} ${event.comarca}`
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        if (haystack.includes(normalizedQuery)) score += 35;
      }

      let distance = Number.POSITIVE_INFINITY;
      if (context.latitude !== undefined && context.longitude !== undefined) {
        if (event.latitude === undefined || event.longitude === undefined) return [];
        distance = haversineKm(context.latitude, context.longitude, event.latitude, event.longitude);
        if (distance > (context.radiusKm ?? 25)) return [];
        score += Math.max(0, 30 - distance);
      }

      return [{ event, score, distance }];
    })
    .sort((left, right) => right.score - left.score || left.distance - right.distance || left.event.startsAt.localeCompare(right.event.startsAt))
    .filter((entry, index, entries) => {
      const key = `${entry.event.code}:${entry.event.municipalitySlug}`;
      return entries.findIndex((candidate) => `${candidate.event.code}:${candidate.event.municipalitySlug}` === key) === index;
    })
    .map((entry) => entry.event);
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function categoryLabel(event: EventItem, language: Language): string {
  const joined = event.categories.join(" ");
  if (/concert|musica|música/.test(joined)) return language === "ca" ? "Música" : "Música";
  if (/festes|festival/.test(joined)) return language === "ca" ? "Festa" : "Fiesta";
  return language === "ca" ? "Cultura" : "Cultura";
}
