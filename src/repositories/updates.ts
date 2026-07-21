import type { Env } from "../types";

export async function claimUpdate(env: Env, updateId: number, now = new Date()): Promise<string | null> {
  const nowIso = now.toISOString();
  const leaseUntil = new Date(now.getTime() + 2 * 60 * 1000).toISOString();
  const claimToken = crypto.randomUUID();
  const row = await env.DB.prepare(
    `INSERT INTO processed_updates (update_id, status, lease_until, claim_token, updated_at)
     VALUES (?, 'processing', ?, ?, ?)
     ON CONFLICT(update_id) DO UPDATE SET
       status = 'processing',
       attempts = processed_updates.attempts + 1,
       lease_until = excluded.lease_until,
       claim_token = excluded.claim_token,
       updated_at = excluded.updated_at
     WHERE processed_updates.status != 'done' AND processed_updates.lease_until <= ?
     RETURNING update_id`
  )
    .bind(String(updateId), leaseUntil, claimToken, nowIso, nowIso)
    .first<{ update_id: string }>();
  return row === null ? null : claimToken;
}

export async function markUpdateDone(env: Env, updateId: number, claimToken: string): Promise<void> {
  await env.DB.prepare(
    "UPDATE processed_updates SET status = 'done', updated_at = CURRENT_TIMESTAMP WHERE update_id = ? AND status = 'processing' AND claim_token = ?"
  ).bind(String(updateId), claimToken).run();
}

export async function releaseUpdate(env: Env, updateId: number, claimToken: string): Promise<void> {
  await env.DB.prepare(
    "UPDATE processed_updates SET lease_until = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE update_id = ? AND status = 'processing' AND claim_token = ?"
  ).bind(String(updateId), claimToken).run();
}

export async function cleanupProcessedUpdates(env: Env): Promise<void> {
  await env.DB.prepare(
    `DELETE FROM processed_updates WHERE update_id IN (
       SELECT update_id FROM processed_updates
       WHERE (status = 'done' AND julianday(updated_at) < julianday('now', '-7 days'))
          OR julianday(updated_at) < julianday('now', '-30 days')
       LIMIT 500
     )`
  ).run();
}
