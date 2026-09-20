CREATE TABLE IF NOT EXISTS leadership_history_entries(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('SPL','Scoutmaster')),
  start_year INTEGER NOT NULL,
  end_year INTEGER NOT NULL,
  spl_name TEXT NOT NULL DEFAULT '',
  aspl_name TEXT NOT NULL DEFAULT '',
  scoutmaster_name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(start_year>=1),
  CHECK(end_year>=1)
);

CREATE INDEX IF NOT EXISTS idx_leadership_history_entries_order
  ON leadership_history_entries(
    start_year DESC,
    end_year DESC,
    created_at DESC,
    id DESC
  );

INSERT INTO leadership_history_entries(
  type,
  start_year,
  end_year,
  spl_name,
  aspl_name
)
SELECT
  'SPL',
  start_year,
  end_year,
  MAX(
    CASE
      WHEN type='SPL'
      THEN person_name
      ELSE ''
    END
  ),
  MAX(
    CASE
      WHEN type='ASPL'
      THEN person_name
      ELSE ''
    END
  )
FROM leadership_history
WHERE type IN('SPL','ASPL')
GROUP BY
  start_year,
  end_year;

INSERT INTO leadership_history_entries(
  type,
  start_year,
  end_year,
  scoutmaster_name
)
SELECT
  'Scoutmaster',
  start_year,
  end_year,
  person_name
FROM leadership_history
WHERE type='Scoutmaster';
