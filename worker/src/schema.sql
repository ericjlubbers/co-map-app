-- Maps table
CREATE TABLE IF NOT EXISTS maps (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled Map',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
  design_state TEXT NOT NULL DEFAULT '{}',
  data_config TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for listing by status
CREATE INDEX IF NOT EXISTS idx_maps_status ON maps(status);

-- Index for ordering by updated_at
CREATE INDEX IF NOT EXISTS idx_maps_updated ON maps(updated_at DESC);
