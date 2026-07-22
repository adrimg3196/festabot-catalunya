import { extractText, getDocumentProxy } from "unpdf";

const DATASET_ENDPOINT = "https://analisi.transparenciacatalunya.cat/resource/rhpv-yr4f.json";
const DEFAULT_SYNC_ENDPOINT = "https://festabot-catalunya.adrimg3196.workers.dev/internal/programs/sync";
const MAX_PDF_BYTES = 32 * 1024 * 1024;
const MAX_TEXT_LENGTH = 180_000;

function madridDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function decodeEntities(value) {
  return value.replace(/&amp;/gi, "&").replace(/&quot;/gi, "\"").replace(/&#39;|&apos;/gi, "'");
}

function documentUrls(row) {
  const eventYears = new Set([String(row.data_inici ?? "").slice(0, 4), String(row.data_fi ?? "").slice(0, 4)].filter(Boolean));
  const candidates = [...String(row.descripcio_html ?? "").matchAll(/href\s*=\s*["']([^"']+)["']/gi)]
    .map((match) => decodeEntities(match[1] ?? ""));
  if (row.documents) candidates.push(row.documents);
  return [...new Set(candidates.flatMap((candidate) => candidate.split(/[|\n]/)).map((candidate) => {
    try {
      const url = new URL(candidate.trim(), "https://agenda.cultura.gencat.cat/");
      const path = decodeURIComponent(url.pathname).toLowerCase();
      const explicitYears = `${path}${url.search}`.match(/(?:19|20)\d{2}/g) ?? [];
      if (explicitYears.length && eventYears.size && !explicitYears.some((year) => eventYears.has(year))) {
        return undefined;
      }
      return (url.protocol === "https:" || url.protocol === "http:")
        && (path.endsWith(".pdf") || path.includes(".pdf/"))
        ? url.toString()
        : undefined;
    } catch {
      return undefined;
    }
  }).filter(Boolean))].slice(0, 5);
}

function cleanPdfText(value) {
  return value
    .normalize("NFC")
    .replace(/\r/g, "")
    .replace(/([\p{L}])-\n(?=[\p{Ll}])/gu, "$1")
    .split("\n")
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

async function downloadPdf(sourceUrl) {
  const response = await fetch(sourceUrl, {
    headers: { Accept: "application/pdf" },
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error(`PDF returned ${response.status}`);
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PDF_BYTES) throw new Error("PDF is too large");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_PDF_BYTES) throw new Error("PDF is too large");
  return bytes;
}

async function extractProgram(sourceUrl) {
  const pdf = await getDocumentProxy(await downloadPdf(sourceUrl));
  try {
    const extracted = await extractText(pdf);
    const pages = Array.isArray(extracted.text) ? extracted.text : [extracted.text];
    const text = cleanPdfText(pages.join("\n\n"));
    return text.length >= 200 ? text : undefined;
  } finally {
    await pdf.destroy();
  }
}

async function upcomingFestas() {
  const start = madridDateString();
  const end = addDays(start, 179);
  const titleCondition = "(lower(denominaci) like 'festa major%' OR lower(denominaci) like 'festes majors%' OR lower(denominaci) like 'la festa major%' OR lower(denominaci) like 'fiesta mayor%' OR lower(denominaci) like '% - festa major%' OR lower(denominaci) like '% – festa major%' OR lower(denominaci) like 'les santes%' OR lower(denominaci) like 'festes de la mercè%')";
  const cataloniaCondition = "(municipi like 'agenda:ubicacions/barcelona/%' OR municipi like 'agenda:ubicacions/girona/%' OR municipi like 'agenda:ubicacions/lleida/%' OR municipi like 'agenda:ubicacions/tarragona/%')";
  const params = new URLSearchParams({
    "$select": ":updated_at as source_updated_at,codi,denominaci,data_inici,data_fi,descripcio_html,documents",
    "$where": `data_inici <= '${end}T23:59:59.999' AND data_fi >= '${start}T00:00:00.000' AND ${cataloniaCondition} AND ${titleCondition}`,
    "$order": "data_inici ASC, :updated_at DESC",
    "$limit": "500"
  });
  const response = await fetch(`${DATASET_ENDPOINT}?${params}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error(`Agenda API returned ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error("Agenda API returned an invalid payload");
  return rows;
}

async function uploadProgram(endpoint, secret, payload) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error(`Program sync endpoint returned ${response.status}`);
}

async function main() {
  const secret = process.env.PROGRAM_SYNC_SECRET;
  const endpoint = process.env.PROGRAM_SYNC_ENDPOINT || DEFAULT_SYNC_ENDPOINT;
  if (!secret) throw new Error("PROGRAM_SYNC_SECRET is required");
  const rows = await upcomingFestas();
  let synced = 0;
  let unavailable = 0;
  for (const row of rows) {
    const urls = documentUrls(row);
    if (!urls.length || !/^\d{5,20}$/.test(String(row.codi ?? ""))) continue;
    let text;
    let sourceUrl;
    for (const candidate of urls) {
      try {
        text = await extractProgram(candidate);
        if (text) {
          sourceUrl = candidate;
          break;
        }
      } catch (error) {
        console.warn(`No se pudo extraer ${row.codi} desde ${new URL(candidate).hostname}: ${String(error)}`);
      }
    }
    if (!text || !sourceUrl) {
      unavailable += 1;
      continue;
    }
    await uploadProgram(endpoint, secret, {
      eventCode: String(row.codi),
      sourceUrl,
      sourceUpdatedAt: String(row.source_updated_at ?? ""),
      text
    });
    synced += 1;
    console.log(`Sincronizado ${row.codi}: ${text.length} caracteres`);
  }
  console.log(`Sincronización terminada: ${synced} programas, ${unavailable} documentos no extraíbles`);
}

await main();
