-- items
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  -- Nullable for now. Future: populate from auth context.
  user_id TEXT,
  url TEXT NOT NULL,
  url_normalized TEXT NOT NULL,
  title TEXT,
  domain TEXT,
  status TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  clean_text TEXT,
  clean_html TEXT,
  summary TEXT,
  summary_source TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  processed_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_items_user_id_url_normalized ON items(user_id, url_normalized);
CREATE INDEX IF NOT EXISTS idx_items_user_id_created_at ON items(user_id, created_at);

-- tags
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  -- Nullable for now. Future: populate from auth context.
  user_id TEXT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  item_count INTEGER DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_user_id_name ON tags(user_id, name);

-- users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id_created_at ON sessions(user_id, created_at);

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

-- chat sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  -- Nullable for now. Future: populate from auth context.
  user_id TEXT,
  title TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id_updated_at ON chat_sessions(user_id, updated_at);

-- chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  -- Nullable for now. Future: populate from auth context.
  user_id TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  meta_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id_created_at ON chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id_created_at ON chat_messages(user_id, created_at);
