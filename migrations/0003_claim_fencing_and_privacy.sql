ALTER TABLE reminders ADD COLUMN claim_token TEXT;
ALTER TABLE processed_updates ADD COLUMN claim_token TEXT;

DROP INDEX IF EXISTS idx_corrections_pending;
DROP INDEX IF EXISTS idx_corrections_deduplicate;
ALTER TABLE corrections RENAME TO corrections_legacy;

CREATE TABLE corrections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT NOT NULL,
  event_code TEXT NOT NULL,
  correction_type TEXT NOT NULL CHECK (correction_type IN ('cancelled', 'time', 'place', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO corrections (
  id, telegram_id, event_code, correction_type, status, created_at
)
SELECT
  legacy.id,
  legacy.telegram_id,
  legacy.event_code,
  legacy.correction_type,
  legacy.status,
  legacy.created_at
FROM corrections_legacy AS legacy
INNER JOIN users ON users.telegram_id = legacy.telegram_id;

DROP TABLE corrections_legacy;

CREATE INDEX idx_corrections_pending
  ON corrections(status, created_at);
CREATE UNIQUE INDEX idx_corrections_deduplicate
  ON corrections(telegram_id, event_code, correction_type);
CREATE INDEX idx_corrections_retention
  ON corrections(created_at);
CREATE INDEX idx_reminders_sent_retention
  ON reminders(sent_at);
CREATE INDEX idx_reminders_failed_retention
  ON reminders(failed_at);
