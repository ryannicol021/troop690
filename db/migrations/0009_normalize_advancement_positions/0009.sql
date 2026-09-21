WITH ranked AS(
  SELECT
    id,
    ROW_NUMBER() OVER(
      PARTITION BY rank
      ORDER BY visible_order,id
    )-1 AS new_order
  FROM advancement_requirements
)
UPDATE advancement_requirements
SET visible_order=(
  SELECT new_order
  FROM ranked
  WHERE ranked.id=advancement_requirements.id
);
