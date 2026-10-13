-- Multirange types.
-- Requires PostgreSQL 14+.

SET client_min_messages = warning;

ALTER TABLE products ADD COLUMN availability_windows tstzmultirange;
ALTER TABLE products ADD COLUMN size_ranges_cm nummultirange;
ALTER TABLE users ADD COLUMN working_hours_utc int4multirange;

UPDATE products SET
  availability_windows = tstzmultirange(
    tstzrange(now() - interval '60 days', now() - interval '30 days'),
    tstzrange(now() + interval '10 days', now() + interval '20 days'),
    tstzrange(now() + interval '90 days', NULL)
  ),
  size_ranges_cm = nummultirange(numrange(10, 20), numrange(35.5, 40))
WHERE id % 4 = 0;

-- Backfill without bumping updated_at
ALTER TABLE users DISABLE TRIGGER users_set_updated_at;
UPDATE users SET working_hours_utc = int4multirange(int4range(8, 12), int4range(13, 17))
WHERE id % 2 = 0;
ALTER TABLE users ENABLE TRIGGER users_set_updated_at;
