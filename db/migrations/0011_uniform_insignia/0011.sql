CREATE TABLE IF NOT EXISTS uniform_insignia(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  x_percent REAL NOT NULL,
  y_percent REAL NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(x_percent>=0 AND x_percent<=100),
  CHECK(y_percent>=0 AND y_percent<=100)
);

CREATE INDEX IF NOT EXISTS idx_uniform_insignia_id
ON uniform_insignia(id);
