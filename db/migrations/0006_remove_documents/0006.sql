PRAGMA foreign_keys=ON;

DELETE FROM position_permissions
WHERE permission_id IN (
  SELECT id
  FROM permission_titles
  WHERE code IN ('DOCV','DOC')
);

DELETE FROM permission_titles
WHERE code IN ('DOCV','DOC');

DROP TABLE IF EXISTS event_documents;
DROP TABLE IF EXISTS documents;
