CREATE TABLE IF NOT EXISTS program_documents (
  event_code TEXT PRIMARY KEY,
  source_url TEXT NOT NULL,
  source_updated_at TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL CHECK (length(text) BETWEEN 200 AND 180000),
  extracted_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_program_documents_extracted_at
  ON program_documents(extracted_at);
