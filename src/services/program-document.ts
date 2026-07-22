import type { Env, EventItem } from "../types";

export interface OfficialProgramDocument {
  sourceUrl: string;
  text: string;
}

interface ProgramDocumentRow {
  source_url: string;
  text: string;
}

export async function getOfficialProgramDocument(
  env: Env,
  event: EventItem,
  _options: { fresh?: boolean } = {}
): Promise<OfficialProgramDocument | null> {
  for (const sourceUrl of event.programDocumentUrls ?? []) {
    const row = await env.DB.prepare(`
      SELECT source_url, text
      FROM program_documents
      WHERE event_code = ?1
        AND source_url = ?2
        AND source_updated_at = ?3
      LIMIT 1
    `).bind(event.code, sourceUrl, event.sourceUpdatedAt ?? "").first<ProgramDocumentRow>();
    if (row?.text) return { sourceUrl: row.source_url, text: row.text };
  }
  return null;
}
