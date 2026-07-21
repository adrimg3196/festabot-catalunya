import type { Env, EventItem } from "../types";

export interface DueReminder {
  id: string;
  chat_id: string;
  event_title: string;
  event_url: string | null;
}

export async function createReminder(
  env: Env,
  telegramId: number,
  chatId: number,
  event: EventItem,
  remindAt: string
): Promise<void> {
  const id = `${telegramId}:${event.code}`;
  await env.DB.prepare(
    `INSERT INTO reminders (id, telegram_id, chat_id, event_code, event_title, event_url, remind_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET remind_at = excluded.remind_at, sent_at = NULL`
  )
    .bind(id, String(telegramId), String(chatId), event.code, event.title, event.sourceUrl ?? null, remindAt)
    .run();
}

export async function listDueReminders(env: Env, nowIso: string): Promise<DueReminder[]> {
  const result = await env.DB.prepare(
    "SELECT id, chat_id, event_title, event_url FROM reminders WHERE sent_at IS NULL AND remind_at <= ? ORDER BY remind_at LIMIT 50"
  )
    .bind(nowIso)
    .all<DueReminder>();
  return result.results;
}

export async function markReminderSent(env: Env, id: string): Promise<void> {
  await env.DB.prepare("UPDATE reminders SET sent_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id).run();
}

