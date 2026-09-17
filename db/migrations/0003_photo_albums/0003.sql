PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS photo_albums(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL UNIQUE,
  cover_photo_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_photo_albums_event_id
ON photo_albums(event_id);

INSERT OR IGNORE INTO photo_albums(event_id,cover_photo_id)
SELECT
  event_id,
  MIN(id)
FROM photos
GROUP BY event_id;

UPDATE permission_titles
SET
  name='View Photos',
  description='View and download member photos.'
WHERE code='PHV';
