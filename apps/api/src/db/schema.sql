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

-- tags
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  item_count INTEGER DEFAULT 0
);

-- item-tags
CREATE TABLE IF NOT EXISTS item_tags (
  item_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (item_id, tag_id),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_item_tags_item_id ON item_tags(item_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_tag_id ON item_tags(tag_id);

-- jobs (lease/backoff)
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_jobs_item_id ON jobs(item_id);
CREATE INDEX IF NOT EXISTS idx_jobs_state_run_after ON jobs(state, run_after);

-- FTS skeleton (real FTS5 implementation can replace later)
CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
  item_id UNINDEXED,
  title,
  summary,
  tags,
  clean_text
);
