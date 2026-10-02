INSERT OR IGNORE INTO leadership_positions(
  name,
  description,
  public_visible,
  visible_order
)
SELECT
  p.name,
  'Description',
  0,
  0
FROM positions p
WHERE
  p.category='youth'
  AND (
    p.code IS NULL
    OR p.code<>'YOUTH'
  );

UPDATE leadership_positions
SET
  public_visible=0,
  visible_order=0
WHERE name IN(
  SELECT name
  FROM positions
  WHERE
    category='youth'
    AND (
      code IS NULL
      OR code<>'YOUTH'
    )
);

UPDATE leadership_positions
SET public_visible=1
WHERE name IN(
  SELECT DISTINCT p.name
  FROM positions p
  JOIN person_positions pp
    ON pp.position_id=p.id
  JOIN people pe
    ON pe.id=pp.person_id
  WHERE
    p.category='youth'
    AND (
      p.code IS NULL
      OR p.code<>'YOUTH'
    )
    AND pe.archived=0
);

UPDATE leadership_positions
SET visible_order=(
  SELECT COUNT(*)
  FROM positions p2
  WHERE
    p2.category='youth'
    AND (
      p2.code IS NULL
      OR p2.code<>'YOUTH'
    )
    AND EXISTS(
      SELECT 1
      FROM person_positions pp2
      JOIN people pe2
        ON pe2.id=pp2.person_id
      WHERE
        pp2.position_id=p2.id
        AND pe2.archived=0
    )
    AND p2.id<(
      SELECT p1.id
      FROM positions p1
      WHERE p1.name=leadership_positions.name
    )
)
WHERE public_visible=1;
