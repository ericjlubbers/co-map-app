-- Add status column to users for archive/restore workflow
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- App-level settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
