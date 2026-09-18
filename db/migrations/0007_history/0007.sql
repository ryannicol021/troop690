CREATE TABLE IF NOT EXISTS history(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  statement TEXT NOT NULL,
  priority INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(year>=1),
  CHECK(priority>=1 AND priority<=100)
);

CREATE INDEX IF NOT EXISTS idx_history_year_priority
  ON history(year DESC,priority ASC,id ASC);
