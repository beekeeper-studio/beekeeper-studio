-- Old-style partitioning with table inheritance, CHECK constraints and an insert trigger.
-- Databases that started life before PostgreSQL 10 still have tables like this.
-- Runs on every supported version (9.6+).

SET client_min_messages = warning;
SELECT setseed(0.50);

CREATE TABLE metrics_legacy (
  id bigserial NOT NULL,
  account_id bigint NOT NULL,
  metric text NOT NULL,
  recorded_at timestamptz NOT NULL,
  value double precision,
  dimensions hstore,
  samples real[]
);
COMMENT ON TABLE metrics_legacy IS 'Inheritance-partitioned by month. Inserts into the parent are routed by metrics_legacy_insert_trigger.';

CREATE FUNCTION metrics_legacy_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('INSERT INTO %I SELECT ($1).*', 'metrics_legacy_' || to_char(NEW.recorded_at, '"y"YYYY"m"MM'))
  USING NEW;
  RETURN NULL;
EXCEPTION WHEN undefined_table THEN
  RAISE EXCEPTION 'No metrics_legacy partition for %', NEW.recorded_at;
END
$$;

DO $$
DECLARE
  month_start timestamptz;
  child text;
BEGIN
  FOR month_start IN
    SELECT generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month')
  LOOP
    child := 'metrics_legacy_' || to_char(month_start, '"y"YYYY"m"MM');
    EXECUTE format(
      'CREATE TABLE %I (CHECK (recorded_at >= %L AND recorded_at < %L)) INHERITS (metrics_legacy)',
      child, month_start, month_start + interval '1 month'
    );
    EXECUTE format('ALTER TABLE %I ADD PRIMARY KEY (id)', child);
    EXECUTE format('CREATE INDEX %I ON %I (account_id, recorded_at)', child || '_account_recorded_idx', child);

    EXECUTE format($sql$
      INSERT INTO %I (account_id, metric, recorded_at, value, dimensions, samples)
      SELECT
        1 + (g %% 500),
        seed.pick(ARRAY['api.requests', 'api.errors', 'storage.bytes', 'jobs.queued', 'cpu.seconds']),
        %L::timestamptz + random() * (least(%L::timestamptz, now()) - %L::timestamptz),
        round((random() * 10000)::numeric, 3),
        hstore(ARRAY['region', 'host'], ARRAY[seed.pick(ARRAY['us-east-1', 'eu-west-1', 'ap-south-1']), 'worker-' || seed.rand_int(1, 40)]),
        ARRAY[random(), random(), random()]::real[]
      FROM generate_series(1, 5000) g
    $sql$, child, month_start, month_start + interval '1 month', month_start);
  END LOOP;
END
$$;

CREATE TRIGGER metrics_legacy_insert_trigger
  BEFORE INSERT ON metrics_legacy
  FOR EACH ROW EXECUTE PROCEDURE metrics_legacy_insert();
