import type { Env, EventItem } from "../types";
import { getEventByReference } from "../services/agenda";

export interface OfficialProgramDocument {
  sourceUrl: string;
  text: string;
  extractedAt?: string;
}

interface ProgramDocumentRow {
  source_url: string;
  text: string;
  extracted_at: string;
}

export async function getOfficialProgramDocument(
  env: Env,
  event: EventItem,
  options: { fresh?: boolean } = {}
): Promise<OfficialProgramDocument | null> {
  let sourceUpdatedAt = event.sourceUpdatedAt ?? "";
  if (options.fresh) {
    const refreshed = await getEventByReference(event.code, { fresh: true });
    if (refreshed?.sourceUpdatedAt) sourceUpdatedAt = refreshed.sourceUpdatedAt;
  }
  for (const sourceUrl of event.programDocumentUrls ?? []) {
    const row = await env.DB.prepare(`
      SELECT source_url, text, extracted_at
      FROM program_documents
      WHERE event_code = ?1
        AND source_url = ?2
        AND source_updated_at = ?3
      LIMIT 1
    `).bind(event.code, sourceUrl, sourceUpdatedAt).first<ProgramDocumentRow>();
    if (row?.text) return { sourceUrl: row.source_url, text: row.text, extractedAt: row.extracted_at };
  }
  return null;
}
