ALTER TABLE announcements
ADD COLUMN sort_order INTEGER;

UPDATE announcements
SET sort_order = (
  SELECT COUNT(*)
  FROM announcements AS other
  WHERE
    other.created_at > announcements.created_at
    OR (
      other.created_at = announcements.created_at
      AND other.id > announcements.id
    )
);
