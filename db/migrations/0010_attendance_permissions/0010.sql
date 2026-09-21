ALTER TABLE event_attendance
ADD COLUMN response TEXT NOT NULL DEFAULT 'Unsure'
CHECK(response IN ('Yes','Unsure','No'));

ALTER TABLE permission_forms
ADD COLUMN revoked_at TEXT;

CREATE TABLE IF NOT EXISTS permission_checkoffs (
  event_id INTEGER NOT NULL,
  scout_person_id INTEGER NOT NULL,
  checked INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(event_id,scout_person_id),
  FOREIGN KEY(event_id)
    REFERENCES events(id)
    ON DELETE CASCADE,
  FOREIGN KEY(scout_person_id)
    REFERENCES people(id)
    ON DELETE CASCADE
);
