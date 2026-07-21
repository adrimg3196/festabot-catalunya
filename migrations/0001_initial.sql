PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  telegram_id TEXT PRIMARY KEY,
  language TEXT NOT NULL DEFAULT 'ca' CHECK (language IN ('ca', 'es')),
  home_municipality TEXT,
  radius_km INTEGER NOT NULL DEFAULT 25 CHECK (radius_km BETWEEN 5 AND 100),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS follows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('municipality', 'artist', 'comarca')),
  value TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (telegram_id, kind, value),
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  telegram_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  event_code TEXT NOT NULL,
  event_title TEXT NOT NULL,
  event_url TEXT,
  remind_at TEXT NOT NULL,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reminders_due
  ON reminders(sent_at, remind_at);

CREATE TABLE IF NOT EXISTS corrections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT NOT NULL,
  event_code TEXT NOT NULL,
  correction_type TEXT NOT NULL CHECK (correction_type IN ('cancelled', 'time', 'place', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_corrections_pending
  ON corrections(status, created_at);

