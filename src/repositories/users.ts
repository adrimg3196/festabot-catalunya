import type { Env, Language } from "../types";

export async function getLanguage(env: Env, telegramId: number): Promise<Language> {
  const row = await env.DB.prepare("SELECT language FROM users WHERE telegram_id = ?")
    .bind(String(telegramId))
    .first<{ language: Language }>();
  return row?.language === "es" ? "es" : "ca";
}

export async function setLanguage(env: Env, telegramId: number, language: Language): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO users (telegram_id, language) VALUES (?, ?)
     ON CONFLICT(telegram_id) DO UPDATE SET language = excluded.language, updated_at = CURRENT_TIMESTAMP`
  )
    .bind(String(telegramId), language)
    .run();
}

export async function ensureUser(env: Env, telegramId: number, language: Language): Promise<void> {
  await env.DB.prepare("INSERT OR IGNORE INTO users (telegram_id, language) VALUES (?, ?)")
    .bind(String(telegramId), language)
    .run();
}

export async function deleteUserData(env: Env, telegramId: number): Promise<void> {
  const id = String(telegramId);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM reminders WHERE telegram_id = ?").bind(id),
    env.DB.prepare("DELETE FROM corrections WHERE telegram_id = ?").bind(id),
    env.DB.prepare("DELETE FROM users WHERE telegram_id = ?").bind(id)
  ]);
}

