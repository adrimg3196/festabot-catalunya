import type { Env } from "../types";

export type CorrectionType = "cancelled" | "time" | "place" | "other";

export async function createCorrection(
  env: Env,
  telegramId: number,
  eventCode: string,
  type: CorrectionType
): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO corrections (telegram_id, event_code, correction_type) VALUES (?, ?, ?)"
  )
    .bind(String(telegramId), eventCode, type)
    .run();
}

