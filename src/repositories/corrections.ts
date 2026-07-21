import type { Env } from "../types";

export type CorrectionType = "cancelled" | "time" | "place" | "other";

export async function createCorrection(
  env: Env,
  telegramId: number,
  eventCode: string,
  type: CorrectionType
): Promise<void> {
  await env.DB.prepare(
    "INSERT OR IGNORE INTO corrections (telegram_id, event_code, correction_type) VALUES (?, ?, ?)"
  )
    .bind(String(telegramId), eventCode, type)
    .run();
}

export async function cleanupCorrections(env: Env): Promise<void> {
  await env.DB.prepare(
    `DELETE FROM corrections WHERE id IN (
       SELECT id FROM corrections
       WHERE julianday(created_at) < julianday('now', '-90 days')
       LIMIT 500
     )`
  ).run();
}
