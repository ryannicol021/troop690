PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS eagle_resource_documents (
  resource_key TEXT PRIMARY KEY
    CHECK(resource_key IN (
      'project_instructions',
      'workbook',
      'application',
      'court_of_honor_instructions'
    )),
  source_type TEXT NOT NULL DEFAULT 'none'
    CHECK(source_type IN ('none','upload','url')),
  storage_key TEXT,
  external_url TEXT,
  original_filename TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  updated_by_account_id INTEGER,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (source_type='none'
      AND storage_key IS NULL
      AND external_url IS NULL)
    OR
    (source_type='upload'
      AND storage_key IS NOT NULL
      AND TRIM(storage_key)<>''
      AND external_url IS NULL)
    OR
    (source_type='url'
      AND storage_key IS NULL
      AND external_url IS NOT NULL
      AND TRIM(external_url)<>'')
  )
);

INSERT OR IGNORE INTO eagle_resource_documents(resource_key)
VALUES
  ('project_instructions'),
  ('workbook'),
  ('application'),
  ('court_of_honor_instructions');

CREATE TABLE IF NOT EXISTS eagle_dignitaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  expiration_date TEXT,
  group_key TEXT NOT NULL
    CHECK(group_key IN (
      'core',
      'local',
      'national'
    )),
  display_order INTEGER NOT NULL DEFAULT 0,
  contact_type TEXT
    CHECK(
      contact_type IS NULL
      OR contact_type IN (
        'website',
        'email',
        'phone',
        'address'
      )
    ),
  contact_value TEXT NOT NULL DEFAULT '',
  street_address_1 TEXT NOT NULL DEFAULT '',
  street_address_2 TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  zip TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    expiration_date IS NULL
    OR (
      length(expiration_date)=10
      AND expiration_date GLOB
        '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_eagle_dignitaries_group_order
ON eagle_dignitaries(group_key, display_order, id);

CREATE INDEX IF NOT EXISTS idx_eagle_dignitaries_expiration
ON eagle_dignitaries(expiration_date);

CREATE TABLE IF NOT EXISTS eagle_dignitary_towns (
  dignitary_id INTEGER NOT NULL,
  town TEXT NOT NULL COLLATE NOCASE,
  PRIMARY KEY(dignitary_id, town),
  FOREIGN KEY(dignitary_id)
    REFERENCES eagle_dignitaries(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_eagle_dignitary_towns_town
ON eagle_dignitary_towns(town);

CREATE TABLE IF NOT EXISTS eagle_resources_script (
  id INTEGER PRIMARY KEY CHECK(id=1),
  content_json TEXT NOT NULL,
  updated_by_account_id INTEGER,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO eagle_resources_script(
  id,
  content_json
)
VALUES (
  1,
  '{"format":"eaglescript","version":1,"sections":[]}'
);

CREATE TABLE IF NOT EXISTS eagle_resource_cleanup_queue (
  storage_key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_attempt_at TEXT
);
