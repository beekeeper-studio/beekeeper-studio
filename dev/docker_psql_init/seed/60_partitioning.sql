-- Declarative partitioning: range, hash, list, multi-level, DEFAULT and MINVALUE partitions.
-- Requires PostgreSQL 11+ (hash partitioning, default partitions, keys and indexes on the parent).

SET client_min_messages = warning;
SELECT setseed(0.60);

-- ---------------------------------------------------------------------------
-- analytics.events: RANGE by month
--   events_history  everything older than 18 months (FROM MINVALUE)
--   events_YYYY_MM  one per month: 18 past months, the current one, and 3 future (empty) ones
--   events_default  anything else
-- ---------------------------------------------------------------------------

CREATE TABLE analytics.events (
  id bigserial NOT NULL,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  account_id bigint NOT NULL,
  user_id bigint,
  anonymous_id uuid,
  session_id text,
  event_name text NOT NULL,
  event_category text,
  properties jsonb NOT NULL DEFAULT '{}',
  context jsonb,
  page_url text,
  referrer text,
  ip inet,
  country char(2),
  revenue numeric(12, 2),
  PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);
COMMENT ON TABLE analytics.events IS 'Product analytics events, partitioned by month.';

DO $$
DECLARE
  first_month timestamptz := date_trunc('month', now()) - interval '18 months';
  month_start timestamptz;
BEGIN
  EXECUTE format('CREATE TABLE analytics.events_history PARTITION OF analytics.events FOR VALUES FROM (MINVALUE) TO (%L)', first_month);
  FOR month_start IN SELECT generate_series(first_month, date_trunc('month', now()) + interval '3 months', interval '1 month') LOOP
    EXECUTE format(
      'CREATE TABLE analytics.%I PARTITION OF analytics.events FOR VALUES FROM (%L) TO (%L)',
      'events_' || to_char(month_start, 'YYYY_MM'), month_start, month_start + interval '1 month'
    );
  END LOOP;
  CREATE TABLE analytics.events_default PARTITION OF analytics.events DEFAULT;
END
$$;

INSERT INTO analytics.events (occurred_at, received_at, account_id, user_id, anonymous_id, session_id, event_name, event_category, properties, context, page_url, referrer, ip, country, revenue)
SELECT
  b.occurred_at,
  b.occurred_at + random() * interval '5 seconds',
  1 + (b.g % 500),
  CASE WHEN random() < 0.7 THEN 1 + (b.g * 7) % 10000 END,
  CASE WHEN random() < 0.6 THEN uuid_generate_v4() END,
  substr(md5('s' || (b.g / 12)), 1, 20),
  b.event_name,
  split_part(b.event_name, '_', 1),
  CASE b.event_name
    WHEN 'order_completed' THEN jsonb_build_object('order_id', b.g, 'total', round((random() * 500)::numeric, 2), 'currency', 'USD', 'products', seed.json_of_size(seed.rand_int(130, 2000)))
    WHEN 'search_performed' THEN jsonb_build_object('query', seed.pick(seed.words()) || ' ' || seed.pick(seed.intl_strings()), 'results', seed.rand_int(0, 500))
    WHEN 'page_viewed' THEN jsonb_build_object('path', '/' || seed.pick(seed.words()), 'title', initcap(seed.pick(seed.words())), 'load_ms', seed.rand_int(80, 9000))
    WHEN 'error_shown' THEN jsonb_build_object('message', seed.pick(ARRAY['Network Error', 'Request failed with status code 500', 'TypeError: Cannot read properties of undefined (reading ''map'')']), 'stack', CASE WHEN random() < 0.5 THEN seed.text_of_size(seed.rand_int(200, 6000)) END)
    ELSE jsonb_build_object('button', seed.pick(ARRAY['save', 'export', 'share', 'invite']), 'variant', seed.pick(ARRAY['a', 'b']))
  END,
  jsonb_build_object(
    'app', jsonb_build_object('name', 'web', 'version', seed.pick(ARRAY['4.1.0', '4.2.3', '5.0.0'])),
    'device', jsonb_build_object('type', seed.pick(ARRAY['desktop', 'mobile', 'tablet']), 'os', seed.pick(ARRAY['macOS 14.4', 'Windows 11', 'iOS 17.4', 'Android 14'])),
    'locale', seed.pick(ARRAY['en-US', 'de-DE', 'ja-JP', 'pt-BR']),
    'screen', jsonb_build_object('width', seed.pick(ARRAY[1440, 1920, 390, 768]), 'height', seed.pick(ARRAY[900, 1080, 844, 1024]))
  ),
  'https://app.example.com/' || seed.pick(seed.words()) || '?ref=' || seed.pick(ARRAY['nav', 'email', 'search']),
  seed.maybe(0.3, 'https://www.google.com/'::text),
  ('100.' || seed.rand_int(64, 127) || '.' || seed.rand_int(0, 255) || '.' || seed.rand_int(1, 254))::inet,
  seed.pick(ARRAY['US', 'US', 'DE', 'GB', 'JP', 'BR', 'IN', 'FR']),
  CASE WHEN b.event_name = 'order_completed' THEN round((random() * 500)::numeric, 2) END
FROM (
  SELECT
    g,
    now() - interval '24 months' * power(random(), 1.5) AS occurred_at,
    seed.pick(ARRAY['page_viewed', 'page_viewed', 'page_viewed', 'button_clicked', 'button_clicked', 'search_performed', 'order_completed', 'error_shown']) AS event_name
  FROM generate_series(1, 100000) g
) b;

CREATE INDEX events_account_occurred_idx ON analytics.events (account_id, occurred_at DESC);
CREATE INDEX events_name_idx ON analytics.events (event_name);
CREATE INDEX events_properties_idx ON analytics.events USING gin (properties jsonb_path_ops);

-- ---------------------------------------------------------------------------
-- analytics.page_views: HASH by visitor
-- ---------------------------------------------------------------------------

CREATE TABLE analytics.page_views (
  id bigserial NOT NULL,
  visitor_id uuid NOT NULL,
  account_id bigint NOT NULL,
  url text NOT NULL,
  title text,
  referrer text,
  utm jsonb,
  viewport jsonb,
  duration_ms integer,
  scroll_depth percentage,
  viewed_at timestamptz NOT NULL,
  PRIMARY KEY (id, visitor_id)
) PARTITION BY HASH (visitor_id);

DO $$
BEGIN
  FOR i IN 0..7 LOOP
    EXECUTE format('CREATE TABLE analytics.page_views_p%s PARTITION OF analytics.page_views FOR VALUES WITH (MODULUS 8, REMAINDER %s)', i, i);
  END LOOP;
END
$$;

INSERT INTO analytics.page_views (visitor_id, account_id, url, title, referrer, utm, viewport, duration_ms, scroll_depth, viewed_at)
SELECT
  md5('visitor' || (g % 20000))::uuid,
  1 + (g % 500),
  'https://www.example.com/' || seed.pick(ARRAY['', 'pricing', 'blog/' || seed.pick(seed.words()), 'docs/' || seed.pick(seed.words()), 'signup']),
  seed.maybe(0.9, initcap(seed.pick(seed.words())) || ' | Example'),
  seed.maybe(0.4, seed.pick(ARRAY['https://www.google.com/', 'https://duckduckgo.com/', 'https://news.ycombinator.com/', 'https://www.reddit.com/r/PostgreSQL/'])),
  CASE WHEN random() < 0.3 THEN jsonb_build_object('source', seed.pick(ARRAY['google', 'newsletter', 'twitter']), 'medium', seed.pick(ARRAY['cpc', 'email', 'social']), 'campaign', 'launch-' || seed.rand_int(1, 9)) END,
  jsonb_build_object('w', seed.pick(ARRAY[1440, 1920, 390, 768]), 'h', seed.pick(ARRAY[900, 1080, 844, 1024]), 'dpr', seed.pick(ARRAY[1, 2, 3])),
  seed.rand_int(200, 600000),
  round((random() * 100)::numeric, 2),
  seed.rand_ts(now() - interval '180 days', now())
FROM generate_series(1, 100000) g;

CREATE INDEX page_views_viewed_at_idx ON analytics.page_views (viewed_at);

-- ---------------------------------------------------------------------------
-- analytics.api_request_logs: RANGE by day with large request/response bodies.
-- Partition names follow the pg_partman convention (api_request_logs_p20240131).
-- ---------------------------------------------------------------------------

CREATE TABLE analytics.api_request_logs (
  id bigserial NOT NULL,
  requested_at timestamptz NOT NULL,
  account_id bigint,
  api_key_prefix text,
  method text NOT NULL,
  path text NOT NULL,
  query_params jsonb,
  request_headers jsonb,
  request_body jsonb,
  response_status smallint,
  response_headers jsonb,
  response_body text,
  error_message text,
  error_stack text,
  duration_ms integer,
  bytes_in integer,
  bytes_out integer,
  client_ip inet,
  trace_id uuid,
  PRIMARY KEY (id, requested_at)
) PARTITION BY RANGE (requested_at);

DO $$
DECLARE
  day_start timestamptz;
BEGIN
  FOR day_start IN SELECT generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()) + interval '3 days', interval '1 day') LOOP
    EXECUTE format(
      'CREATE TABLE analytics.%I PARTITION OF analytics.api_request_logs FOR VALUES FROM (%L) TO (%L)',
      'api_request_logs_p' || to_char(day_start, 'YYYYMMDD'), day_start, day_start + interval '1 day'
    );
  END LOOP;
  CREATE TABLE analytics.api_request_logs_default PARTITION OF analytics.api_request_logs DEFAULT;
END
$$;

INSERT INTO analytics.api_request_logs (requested_at, account_id, api_key_prefix, method, path, query_params, request_headers, request_body, response_status, response_headers, response_body, error_message, error_stack, duration_ms, bytes_in, bytes_out, client_ip, trace_id)
SELECT
  b.requested_at,
  1 + (b.g % 500),
  'sk_live_' || substr(md5('k' || (b.g % 900)), 1, 6),
  b.method,
  '/v2/' || seed.pick(ARRAY['orders', 'customers', 'products', 'invoices', 'webhooks']) || CASE WHEN b.method <> 'POST' THEN '/' || seed.rand_int(1, 99999) ELSE '' END,
  CASE WHEN b.method = 'GET' THEN jsonb_build_object('limit', seed.pick(ARRAY[10, 50, 100]), 'expand', '["customer", "items"]'::jsonb, 'cursor', seed.maybe(0.5, md5(random()::text))) END,
  jsonb_build_object('accept', 'application/json', 'user-agent', seed.pick(ARRAY['curl/8.4.0', 'python-requests/2.31.0', 'axios/1.6.8', 'Go-http-client/2.0']), 'x-forwarded-for', '203.0.113.' || seed.rand_int(1, 254), 'idempotency-key', seed.maybe(0.3, uuid_generate_v4()::text)),
  CASE WHEN b.method IN ('POST', 'PUT', 'PATCH') THEN seed.json_of_size(seed.long_tail_size() / 4) END,
  b.status,
  jsonb_build_object('content-type', 'application/json; charset=utf-8', 'x-ratelimit-remaining', seed.rand_int(0, 1000)),
  CASE WHEN b.status < 400 THEN seed.json_of_size(seed.long_tail_size() / 4)::text
       ELSE '{"error": {"type": "invalid_request_error", "message": "' || seed.pick(ARRAY['No such order', 'Rate limit exceeded', 'Internal error']) || '"}}' END,
  CASE WHEN b.status >= 500 THEN 'upstream timed out after 30000ms' END,
  CASE WHEN b.status >= 500 THEN seed.text_of_size(seed.rand_int(500, 20000)) END,
  seed.rand_int(3, 30000),
  seed.rand_int(0, 50000),
  seed.rand_int(50, 500000),
  ('198.18.' || seed.rand_int(0, 255) || '.' || seed.rand_int(1, 254))::inet,
  uuid_generate_v4()
FROM (
  SELECT
    g,
    seed.rand_ts(date_trunc('day', now()) - interval '13 days', now()) AS requested_at,
    seed.pick(ARRAY['GET', 'GET', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE']) AS method,
    seed.pick(ARRAY[200, 200, 200, 200, 201, 204, 400, 401, 404, 409, 422, 429, 500, 502, 503])::smallint AS status
  FROM generate_series(1, 10000) g
) b;

CREATE INDEX api_request_logs_account_idx ON analytics.api_request_logs (account_id, requested_at DESC);
CREATE INDEX api_request_logs_errors_idx ON analytics.api_request_logs (response_status) WHERE response_status >= 500;

-- ---------------------------------------------------------------------------
-- audit_log: LIST by region, each region sub-partitioned by RANGE of year
-- ---------------------------------------------------------------------------

CREATE TABLE audit_log (
  id bigserial NOT NULL,
  region text NOT NULL,
  created_at timestamptz NOT NULL,
  account_id bigint NOT NULL,
  actor_user_id bigint,
  actor_type text NOT NULL DEFAULT 'user',
  action text NOT NULL,
  target_type text,
  target_id text,
  ip inet,
  user_agent text,
  changes jsonb,
  request_id uuid,
  PRIMARY KEY (id, region, created_at)
) PARTITION BY LIST (region);
COMMENT ON TABLE audit_log IS 'Two levels of partitioning: LIST (region) then RANGE (created_at) per year.';

DO $$
DECLARE
  r text;
  y int;
  this_year int := extract(year FROM now())::int;
BEGIN
  FOREACH r IN ARRAY ARRAY['us', 'eu', 'apac'] LOOP
    EXECUTE format('CREATE TABLE %I PARTITION OF audit_log FOR VALUES IN (%L) PARTITION BY RANGE (created_at)', 'audit_log_' || r, r);
    FOR y IN this_year - 2 .. this_year LOOP
      EXECUTE format(
        'CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
        'audit_log_' || r || '_' || y, 'audit_log_' || r, make_date(y, 1, 1), make_date(y + 1, 1, 1)
      );
    END LOOP;
    EXECUTE format('CREATE TABLE %I PARTITION OF %I DEFAULT', 'audit_log_' || r || '_default', 'audit_log_' || r);
  END LOOP;
  CREATE TABLE audit_log_other PARTITION OF audit_log DEFAULT;
END
$$;

INSERT INTO audit_log (region, created_at, account_id, actor_user_id, actor_type, action, target_type, target_id, ip, user_agent, changes, request_id)
SELECT
  seed.pick(ARRAY['us', 'us', 'eu', 'eu', 'apac', 'latam']),
  seed.rand_ts(date_trunc('year', now()) - interval '2 years', now()),
  1 + (g % 500),
  CASE WHEN b.actor_type = 'user' THEN 1 + (g * 7) % 10000 END,
  b.actor_type,
  b.action,
  split_part(b.action, '.', 1),
  seed.rand_int(1, 50000)::text,
  ('10.' || seed.rand_int(0, 255) || '.' || seed.rand_int(0, 255) || '.' || seed.rand_int(1, 254))::inet,
  seed.maybe(0.7, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'::text),
  CASE
    WHEN b.action LIKE '%.updated' THEN jsonb_build_object(
      'before', jsonb_build_object('status', 'active', 'seats', seed.rand_int(1, 50), 'notes', seed.maybe(0.2, seed.text_of_size(seed.long_tail_size() / 4))),
      'after', jsonb_build_object('status', seed.pick(ARRAY['active', 'suspended']), 'seats', seed.rand_int(1, 50), 'notes', seed.maybe(0.2, seed.text_of_size(seed.long_tail_size() / 4))))
    WHEN b.action LIKE '%.deleted' THEN jsonb_build_object('snapshot', seed.json_of_size(seed.rand_int(200, 8000)))
    ELSE NULL
  END,
  uuid_generate_v4()
FROM (
  SELECT
    g,
    seed.pick(ARRAY['user', 'user', 'user', 'api_key', 'system']) AS actor_type,
    seed.pick(ARRAY['user.login', 'user.login', 'user.updated', 'order.updated', 'order.deleted', 'settings.updated', 'api_key.created', 'export.downloaded']) AS action
  FROM generate_series(1, 40000) g
) b;

CREATE INDEX audit_log_account_created_idx ON audit_log (account_id, created_at DESC);

-- A materialized view over a partitioned table
CREATE MATERIALIZED VIEW analytics.daily_event_counts AS
SELECT date_trunc('day', occurred_at)::date AS day, event_name, count(*) AS events, count(DISTINCT account_id) AS accounts, sum(revenue) AS revenue
FROM analytics.events
GROUP BY 1, 2;
CREATE UNIQUE INDEX daily_event_counts_key ON analytics.daily_event_counts (day, event_name);
