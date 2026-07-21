ALTER TABLE reminders ADD COLUMN event_reference TEXT;
ALTER TABLE reminders ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'sending', 'sent', 'failed'));
ALTER TABLE reminders ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reminders ADD COLUMN next_attempt_at TEXT;
ALTER TABLE reminders ADD COLUMN lease_until TEXT;
ALTER TABLE reminders ADD COLUMN failed_at TEXT;
ALTER TABLE reminders ADD COLUMN last_error TEXT;

UPDATE reminders
SET event_reference = event_code,
    next_attempt_at = remind_at,
    status = CASE WHEN sent_at IS NOT NULL THEN 'sent' ELSE 'pending' END
WHERE event_reference IS NULL OR next_attempt_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reminders_delivery
  ON reminders(status, next_attempt_at, lease_until, attempts);

DELETE FROM corrections
WHERE id NOT IN (
  SELECT MIN(id)
  FROM corrections
  GROUP BY telegram_id, event_code, correction_type
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_corrections_deduplicate
  ON corrections(telegram_id, event_code, correction_type);

CREATE TABLE IF NOT EXISTS processed_updates (
  update_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'done')),
  attempts INTEGER NOT NULL DEFAULT 1,
  lease_until TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_processed_updates_retention
  ON processed_updates(status, updated_at);
