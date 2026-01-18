-- items
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  url_normalized TEXT NOT NULL UNIQUE,
  title TEXT,
  domain TEXT,
  status TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  clean_text TEXT,
  summary TEXT,
  summary_source TEXT,
  tags_json TEXT,
  tags_source TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  processed_at TEXT
);

-- jobs (lease/backoff)
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  state TEXT NOT NULL,
  attempt INTEGER NOT NULL,
  run_after TEXT NOT NULL,
  locked_by TEXT,
  lock_expires_at TEXT,
  last_error_code TEXT,
  last_error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT
);

-- FTS skeleton (real FTS5 implementation can replace later)
CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
  item_id UNINDEXED,
  title,
  summary,
  tags,
  clean_text
);
