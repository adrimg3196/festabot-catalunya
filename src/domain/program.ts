import { formatDateRange } from "./date";
import { escapeHtml } from "./events";
import type { EventItem, Language } from "../types";

const MADRID_TIME_ZONE = "Europe/Madrid";
const TELEGRAM_TEXT_BUDGET = 3_900;

const labels = {
  ca: {
    checked: "Consultat",
    fallback: "La font oficial encara no ha publicat el programa detallat. Pots tornar a prémer Actualitza més endavant.",
    officialDocument: "Programa oficial",
    officialSummary: "Resum oficial publicat",
    extractedDocument: "Text extret del document oficial",
    extracted: "Extret el",
    schedule: "Horari",
    source: "Font oficial: Agenda Cultural de Catalunya",
    sourceUpdated: "font actualitzada",
    tickets: "Entrades"
  },
  es: {
    checked: "Consultado",
    fallback: "La fuente oficial todavía no ha publicado el programa detallado. Puedes volver a pulsar Actualizar más adelante.",
    officialDocument: "Programa oficial",
    officialSummary: "Resumen oficial publicado",
    extractedDocument: "Texto extraído del documento oficial",
    extracted: "Extraído el",
    schedule: "Horario",
    source: "Fuente oficial: Agenda Cultural de Catalunya",
    sourceUpdated: "fuente actualizada",
    tickets: "Entradas"
  }
} as const;

function cleanupOfficialText(value: string | undefined): string {
  if (!value) return "";
  return value
    .replace(/\r/g, "")
    .replace(/[\t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/(?:\s|\n)+(?:m[eé]s|m[aá]s) informaci[oó]:[\s\S]*$/i, "")
    .replace(/(?:\s|\n)+(?:darrera|[uú]ltima) actualitzaci[oó]n?:[\s\S]*$/i, "")
    .trim();
}

function formatTimestamp(value: string | Date | undefined, language: Language, includeSeconds = false): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;
  return new Intl.DateTimeFormat(language === "ca" ? "ca-ES" : "es-ES", {
    timeZone: MADRID_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(includeSeconds ? { second: "2-digit" } : {})
  }).format(date);
}

export function formatSourceUpdatedAt(value: string | undefined, language: Language): string | undefined {
  return formatTimestamp(value, language);
}

export function isFestaMajor(event: EventItem): boolean {
  return /^(?:la )?(?:festa major|festes majors|fiesta mayor)|[-–]\s*festa major|^les santes|^festes? de la merc[eèé]/i.test(event.title.trim());
}

export function splitProgramText(text: string, maxEscapedLength: number): string[] {
  const remainingText = text.trim();
  if (!remainingText) return [];
  const boundedLength = Math.max(300, maxEscapedLength);
  const chunks: string[] = [];
  let remaining = remainingText;

  while (escapeHtml(remaining).length > boundedLength) {
    let escapedLength = 0;
    let codeUnitIndex = 0;
    let lastWhitespaceIndex = -1;
    for (const character of remaining) {
      const characterLength = escapeHtml(character).length;
      if (escapedLength + characterLength > boundedLength) break;
      escapedLength += characterLength;
      codeUnitIndex += character.length;
      if (/\s/.test(character)) lastWhitespaceIndex = codeUnitIndex;
    }

    const splitAt = lastWhitespaceIndex >= Math.floor(codeUnitIndex * 0.55)
      ? lastWhitespaceIndex
      : Math.max(1, codeUnitIndex);
    chunks.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

export interface ProgramDocumentContent {
  sourceUrl: string;
  text: string;
  extractedAt?: string;
}

function programBody(event: EventItem, language: Language, document?: ProgramDocumentContent): string {
  const copy = labels[language];
  const sections: string[] = [];
  const description = cleanupOfficialText(document?.text ?? event.description);
  if (description) sections.push(description);
  if (event.schedule && !description.toLocaleLowerCase().includes(event.schedule.toLocaleLowerCase())) {
    sections.push(`${copy.schedule}: ${event.schedule.trim()}`);
  }
  if (event.ticketInfo && !description.toLocaleLowerCase().includes(event.ticketInfo.toLocaleLowerCase())) {
    sections.push(`${copy.tickets}: ${event.ticketInfo.trim()}`);
  }
  return sections.join("\n\n") || copy.fallback;
}

export function programPages(
  event: EventItem,
  language: Language,
  checkedAt = new Date(),
  document?: ProgramDocumentContent
): string[] {
  const copy = labels[language];
  const title = escapeHtml(event.title.slice(0, 180));
  const subtitle = event.subtitle ? `\n<i>${escapeHtml(event.subtitle.slice(0, 160))}</i>` : "";
  const place = escapeHtml([event.venue, event.municipality].filter(Boolean).join(" · ").slice(0, 180));
  const date = escapeHtml(formatDateRange(event.startsAt, event.endsAt, language));
  const checked = formatTimestamp(checkedAt, language, true);
  const sourceUpdated = formatSourceUpdatedAt(event.sourceUpdatedAt, language);
  const freshness = [
    checked ? `${copy.checked}: ${checked}` : undefined,
    sourceUpdated ? `${copy.sourceUpdated}: ${sourceUpdated}` : undefined
  ].filter(Boolean).join(" · ");
  const documentNote = document ? `📄 <i>${copy.extractedDocument}</i>\n` : "";
  const extracted = document?.extractedAt
    ? `${copy.extracted} ${formatTimestamp(document.extractedAt, language)}`
    : "";
  const footerParts = [
    freshness ? `🔄 ${escapeHtml(freshness)}` : "",
    extracted ? `📄 ${extracted}` : ""
  ].filter(Boolean);
  const footer = `\n\n${footerParts.length ? `<i>${footerParts.join(" · ")}</i>\n` : ""}${documentNote}<i>${copy.source}</i>`;
  const baseHeader = `🎊 <b>${title}</b>${subtitle}\n📅 ${date}${place ? `\n📍 ${place}` : ""}\n\n`;
  const heading = document ? copy.officialDocument : copy.officialSummary;
  const worstPageHeading = `🗓 <b>${heading} · 999/999</b>\n\n`;
  const bodyBudget = Math.max(600, TELEGRAM_TEXT_BUDGET - baseHeader.length - worstPageHeading.length - footer.length);
  const chunks = splitProgramText(programBody(event, language, document), bodyBudget);
  const pageCount = Math.max(1, chunks.length);

  return (chunks.length ? chunks : [copy.fallback]).map((chunk, index) => {
    const page = pageCount > 1 ? ` · ${index + 1}/${pageCount}` : "";
    return `${baseHeader}🗓 <b>${heading}${page}</b>\n\n${escapeHtml(chunk)}${footer}`;
  });
}
