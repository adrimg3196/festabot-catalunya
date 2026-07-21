import type { Env, EventItem } from "../types";

export interface DueReminder {
  id: string;
  chat_id: string;
  event_title: string;
  event_url: string | null;
  attempts: number;
  claim_token: string;
}

export async function createReminder(
  env: Env,
  telegramId: number,
  chatId: number,
  event: EventItem,
  remindAt: string
): Promise<void> {
  const eventReference = event.sourceRowId ?? event.code;
  const id = `${telegramId}:${chatId}:${eventReference}`;
  await env.DB.prepare(
    `INSERT INTO reminders (
       id, telegram_id, chat_id, event_code, event_reference, event_title, event_url,
       remind_at, next_attempt_at, status, attempts, sent_at, failed_at, lease_until, last_error
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, NULL, NULL, NULL, NULL)
     ON CONFLICT(id) DO UPDATE SET
       chat_id = excluded.chat_id,
       event_code = excluded.event_code,
       event_reference = excluded.event_reference,
       event_title = excluded.event_title,
       event_url = excluded.event_url,
       remind_at = excluded.remind_at,
       next_attempt_at = excluded.next_attempt_at,
       status = 'pending',
       attempts = 0,
       sent_at = NULL,
       failed_at = NULL,
       lease_until = NULL,
       claim_token = NULL,
       last_error = NULL`
  )
    .bind(
      id,
      String(telegramId),
      String(chatId),
      event.code,
      eventReference,
      event.title,
      event.sourceUrl ?? null,
      remindAt,
      remindAt
    )
    .run();
}

export async function claimDueReminders(env: Env, nowIso: string): Promise<DueReminder[]> {
  const parsedNow = Date.parse(nowIso);
  const leaseUntil = new Date((Number.isFinite(parsedNow) ? parsedNow : Date.now()) + 10 * 60 * 1000).toISOString();
  const claimToken = crypto.randomUUID();
  await env.DB.prepare(
    `UPDATE reminders
     SET status = 'failed', failed_at = ?, lease_until = NULL, claim_token = NULL,
         last_error = 'Delivery worker expired after the final attempt'
     WHERE status = 'sending' AND attempts >= 5 AND lease_until IS NOT NULL AND lease_until <= ?`
  ).bind(nowIso, nowIso).run();
  const result = await env.DB.prepare(
    `UPDATE reminders
     SET status = 'sending', attempts = attempts + 1, lease_until = ?, claim_token = ?
     WHERE id IN (
       SELECT id FROM reminders
       WHERE attempts < 5 AND (
         (status = 'pending' AND COALESCE(next_attempt_at, remind_at) <= ?)
         OR (status = 'sending' AND lease_until IS NOT NULL AND lease_until <= ?)
       )
       ORDER BY remind_at
       LIMIT 20
     )
     RETURNING id, chat_id, event_title, event_url, attempts, claim_token`
  )
    .bind(leaseUntil, claimToken, nowIso, nowIso)
    .all<DueReminder>();
  return result.results;
}

export async function markReminderSent(env: Env, id: string, claimToken: string): Promise<void> {
  await env.DB.prepare(
    "UPDATE reminders SET status = 'sent', sent_at = CURRENT_TIMESTAMP, lease_until = NULL, claim_token = NULL, last_error = NULL WHERE id = ? AND status = 'sending' AND claim_token = ?"
  ).bind(id, claimToken).run();
}

export async function markReminderRetry(env: Env, id: string, claimToken: string, retryAt: string, error: string): Promise<void> {
  await env.DB.prepare(
    "UPDATE reminders SET status = 'pending', next_attempt_at = ?, lease_until = NULL, claim_token = NULL, last_error = ? WHERE id = ? AND status = 'sending' AND claim_token = ?"
  ).bind(retryAt, error.slice(0, 300), id, claimToken).run();
}

export async function markReminderFailed(env: Env, id: string, claimToken: string, error: string): Promise<void> {
  await env.DB.prepare(
    "UPDATE reminders SET status = 'failed', failed_at = CURRENT_TIMESTAMP, lease_until = NULL, claim_token = NULL, last_error = ? WHERE id = ? AND status = 'sending' AND claim_token = ?"
  ).bind(error.slice(0, 300), id, claimToken).run();
}

export async function cleanupReminders(env: Env): Promise<void> {
  await env.DB.prepare(
    `DELETE FROM reminders WHERE id IN (
       SELECT id FROM reminders
       WHERE (status = 'sent' AND julianday(sent_at) < julianday('now', '-30 days'))
          OR (status = 'failed' AND julianday(failed_at) < julianday('now', '-30 days'))
       LIMIT 500
     )`
  ).run();
}
