PRAGMA foreign_keys=ON;

DELETE FROM position_permissions
WHERE permission_id IN (
  SELECT id
  FROM permission_titles
  WHERE code='CAMP'
);

DELETE FROM permission_titles
WHERE code='CAMP';
