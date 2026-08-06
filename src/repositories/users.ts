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

export type LatLon = { latitude: number; longitude: number };

export async function getLastLocation(env: Env, telegramId: number): Promise<LatLon | undefined> {
  const row = await env.DB.prepare("SELECT last_location FROM users WHERE telegram_id = ?")
    .bind(String(telegramId))
    .first<{ last_location: string | null }>();
  if (!row?.last_location) return undefined;
  const parts = row.last_location.split(",");
  const lat = Number(parts[0]);
  const lon = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;
  return { latitude: lat, longitude: lon };
}

export async function setLastLocation(env: Env, telegramId: number, origin: LatLon): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO users (telegram_id, last_location) VALUES (?, ?)
     ON CONFLICT(telegram_id) DO UPDATE SET last_location = excluded.last_location, updated_at = CURRENT_TIMESTAMP`
  )
    .bind(String(telegramId), `${origin.latitude},${origin.longitude}`)
    .run();
}

