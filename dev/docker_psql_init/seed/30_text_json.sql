-- Tables with several text and JSON columns whose sizes vary wildly from row to row.
-- Most values are small, some are tens of KB, a few are megabytes (see seed.long_tail_size).
-- Runs on every supported version (9.6+).

SET client_min_messages = warning;
SELECT setseed(0.30);

-- ---------------------------------------------------------------------------
-- support_tickets
-- ---------------------------------------------------------------------------

CREATE TABLE support_tickets (
  id bigserial PRIMARY KEY,
  account_id bigint NOT NULL REFERENCES accounts (id),
  customer_id bigint REFERENCES customers (id),
  assignee_id bigint REFERENCES users (id),
  requester_email text,
  subject varchar(255) NOT NULL,
  status ticket_status NOT NULL DEFAULT 'new',
  priority ticket_priority NOT NULL DEFAULT 'normal',
  stage workflow_stage,
  channel text,
  tags text[],
  description text,
  description_html text,
  internal_notes text,
  last_comment text,
  resolution_summary text,
  satisfaction_comment text,
  custom_fields jsonb,
  metadata jsonb,
  email_headers jsonb,
  source_payload jsonb,
  sla_policy jsonb,
  attachments jsonb,
  conversation json,
  sentiment_score real,
  first_response_at timestamptz,
  solved_at timestamptz,
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE support_tickets IS 'Text and JSON columns with long-tail sizes. Ticket 13 has a ~5MB description, ticket 42 a ~7MB source_payload.';

INSERT INTO support_tickets (
  account_id, customer_id, assignee_id, requester_email, subject, status, priority, stage, channel, tags,
  description, internal_notes, last_comment, resolution_summary, satisfaction_comment, custom_fields,
  metadata, email_headers, source_payload, sla_policy, attachments, conversation, sentiment_score,
  first_response_at, solved_at, due_at, created_at, updated_at
)
SELECT
  cu.account_id,
  cu.id,
  CASE WHEN random() < 0.8 THEN 1 + (b.g * 13) % 10000 END,
  cu.email,
  left(seed.pick(ARRAY[
    'Export is empty', 'Cannot log in', 'Invoice shows wrong seat count', 'Webhook returns 502',
    'Feature request: filter audit log by IP', 'URGENT!!! production down', 'Re: Re: Fwd: question about pricing',
    'エクスポートが空です', '无法登录', 'Problème d''encodage CSV', 'Billing question', 'API rate limits'
  ]) || CASE WHEN random() < 0.1 THEN ' ' || repeat('(follow up) ', seed.rand_int(1, 15)) ELSE '' END, 255),
  b.status,
  seed.pick(enum_range(NULL::ticket_priority)),
  seed.maybe(0.4, seed.pick(enum_range(NULL::workflow_stage))),
  seed.pick(ARRAY['email', 'web', 'chat', 'phone', 'api', 'slack']),
  CASE WHEN random() < 0.7 THEN ARRAY[seed.pick(seed.words()), seed.pick(ARRAY['p1', 'p2', 'p3', 'bug', 'question', 'billing'])] END,
  seed.text_of_size(seed.long_tail_size()),
  CASE WHEN random() < 0.3 THEN seed.text_of_size(seed.long_tail_size() / 2) END,
  CASE WHEN random() < 0.8 THEN seed.pick(seed.paragraphs()) END,
  CASE WHEN b.status IN ('solved', 'closed') THEN seed.text_of_size(seed.rand_int(50, 1500)) END,
  CASE WHEN b.status IN ('solved', 'closed') AND random() < 0.3 THEN seed.pick(ARRAY['Great support, thanks!', 'Took way too long.', '👍', 'すばやい対応ありがとうございました', '']) END,
  jsonb_build_object(
    'product_area', seed.pick(ARRAY['billing', 'reports', 'api', 'sso', 'mobile']),
    'environment', seed.pick(ARRAY['production', 'staging', NULL]),
    'affected_users', seed.rand_int(1, 5000),
    'browser', seed.maybe(0.5, seed.pick(ARRAY['Chrome 124', 'Safari 17.4', 'Firefox 125'])),
    'reproducible', seed.pick(ARRAY['always', 'sometimes', 'once', NULL]),
    'linked_issues', CASE WHEN random() < 0.3 THEN to_jsonb(ARRAY['ENG-' || seed.rand_int(1000, 9999), 'ENG-' || seed.rand_int(1000, 9999)]) ELSE '[]'::jsonb END
  ),
  jsonb_build_object('ip', '198.51.100.' || seed.rand_int(1, 254), 'locale', cu.locale, 'via', 'helpdesk-v2'),
  CASE WHEN random() < 0.6 THEN jsonb_build_object(
    'Message-ID', '<' || md5(random()::text) || '@mail.example.com>',
    'From', cu.first_name || ' <' || cu.email || '>',
    'To', 'support@example.com',
    'Subject', 'Re: ticket',
    'Content-Type', seed.pick(ARRAY['text/plain; charset=utf-8', 'text/html; charset=iso-8859-1', 'multipart/alternative; boundary="000000000000a1b2c3"', 'text/plain; charset=Shift_JIS']),
    'Received', to_jsonb(ARRAY['from mail-ej1-f41.google.com (mail-ej1-f41.google.com [209.85.218.41])', 'by mx.example.com with ESMTPS id ' || md5(random()::text)]),
    'DKIM-Signature', 'v=1; a=rsa-sha256; c=relaxed/relaxed; d=example.com; s=20230601; b=' || encode(gen_random_bytes(180), 'base64'),
    'X-Spam-Score', round((random() * 10)::numeric, 1)
  ) END,
  CASE WHEN random() < 0.85 THEN seed.json_of_size(seed.long_tail_size()) END,
  jsonb_build_object('name', seed.pick(ARRAY['Standard', 'Premium', 'Enterprise 24/7']), 'first_response_minutes', seed.pick(ARRAY[60, 240, 1440]), 'business_hours', random() < 0.7),
  CASE WHEN random() < 0.25 THEN (
    SELECT jsonb_agg(jsonb_build_object('id', 'att_' || md5(i || '-' || b.g), 'filename', seed.pick(ARRAY['screenshot.png', 'har-export.har', 'invoice (1).pdf', 'ログ.txt', 'données.csv']), 'size', seed.rand_int(100, 25000000), 'content_type', seed.pick(ARRAY['image/png', 'application/json', 'application/pdf', 'text/plain', 'text/csv'])))
    FROM generate_series(1, seed.rand_int(1, 5)) i
  ) END,
  CASE WHEN random() < 0.7 THEN (
    SELECT json_agg(json_build_object('author', seed.pick(ARRAY['customer', 'agent', 'bot']), 'body', seed.pick(seed.paragraphs()), 'at', b.created_at + i * interval '3 hours'))
    FROM generate_series(1, seed.rand_int(1, 25)) i
  ) END,
  seed.maybe(0.6, (random() * 2 - 1)::real),
  CASE WHEN b.status <> 'new' THEN b.created_at + random() * interval '2 days' END,
  CASE WHEN b.status IN ('solved', 'closed') THEN b.created_at + random() * interval '20 days' END,
  b.created_at + interval '3 days',
  b.created_at,
  b.created_at + random() * interval '30 days'
FROM (
  SELECT
    g,
    1 + (g * 29) % 20000 AS customer_id,
    seed.pick(ARRAY['new', 'open', 'open', 'pending', 'on_hold', 'solved', 'solved', 'closed', 'closed', 'closed']::ticket_status[]) AS status,
    seed.rand_ts(now() - interval '3 years', now()) AS created_at
  FROM generate_series(1, 5000) g
) b
JOIN customers cu ON cu.id = b.customer_id
ORDER BY b.g;

CREATE INDEX support_tickets_account_status_idx ON support_tickets (account_id, status);
CREATE INDEX support_tickets_custom_fields_idx ON support_tickets USING gin (custom_fields);
CREATE INDEX support_tickets_subject_trgm_idx ON support_tickets USING gin (subject gin_trgm_ops);

UPDATE support_tickets SET description_html = seed.markdown_to_html(description) WHERE random() < 0.5;

-- Outliers: a ~5MB description and a ~7MB JSON payload
UPDATE support_tickets SET description = seed.text_of_size(5 * 1024 * 1024) WHERE id = 13;
UPDATE support_tickets SET source_payload = jsonb_build_object(
  'export', seed.json_of_size(8 * 1024 * 1024),
  'note', 'Customer pasted an entire export into the ticket form'
) WHERE id = 42;

-- ---------------------------------------------------------------------------
-- webhook_events: JSON payloads, including the awkward edge cases first
-- ---------------------------------------------------------------------------

CREATE TABLE webhook_events (
  id bigserial PRIMARY KEY,
  account_id bigint REFERENCES accounts (id),
  provider text NOT NULL,
  event_type text NOT NULL,
  description text,
  payload jsonb,
  payload_raw text,
  headers jsonb,
  signature bytea,
  signature_hex text,
  delivered boolean NOT NULL DEFAULT false,
  attempts smallint NOT NULL DEFAULT 0,
  last_error text,
  received_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE webhook_events IS 'Rows 1-24 are JSON edge cases (scalars, deep nesting, huge numbers, unicode). The rest look like real webhook traffic.';
COMMENT ON COLUMN webhook_events.payload_raw IS 'The body exactly as received, before parsing (whitespace and key order preserved)';

INSERT INTO webhook_events (provider, event_type, description, payload_raw)
VALUES
  ('edge_case', 'empty_object', 'Empty object', '{}'),
  ('edge_case', 'empty_array', 'Empty array', '[]'),
  ('edge_case', 'top_level_array', 'Top-level array of mixed types', '[1, "two", 3.0, true, null, {"six": 6}, [7]]'),
  ('edge_case', 'scalar_string', 'Top-level string', '"just a string"'),
  ('edge_case', 'scalar_number', 'Top-level number', '42'),
  ('edge_case', 'scalar_bool', 'Top-level boolean', 'false'),
  ('edge_case', 'json_null', 'JSON null (not SQL NULL)', 'null'),
  ('edge_case', 'big_integers', 'Integers beyond JavaScript''s safe range lose precision if parsed as numbers',
     '{"twitter_id": 1790000000000000123, "max_int64": 9223372036854775807, "beyond_int64": 123456789012345678901234567890, "negative": -9007199254740993}'),
  ('edge_case', 'decimals', 'Precise decimals and exponents',
     '{"price": 19.990000000000000000001, "tiny": 1e-300, "huge": 1.7976931348623157e308, "money": 0.1, "neg_zero": -0.0, "exp": 6.02214076E+23}'),
  ('edge_case', 'unicode', 'Escapes, emoji and right-to-left text',
     '{"escaped": "café ☃ 😀", "raw": "café ☃ 😀", "rtl": "مرحبا بالعالم", "cjk": "日本語のテキスト", "zwj": "👩‍💻", "control": "tab\there\nnewline \"quoted\" back\\slash"}'),
  ('edge_case', 'odd_keys', 'Keys that are empty, numeric, or need quoting',
     '{"": "empty key", " ": "space key", "123": "numeric key", "key.with.dots": 1, "key with spaces": 2, "ключ": 3, "🔑": 4, "$ref": "#/definitions/x", "__proto__": {"polluted": true}}'),
  ('edge_case', 'duplicate_keys', 'Duplicate keys: jsonb keeps the last value, payload_raw keeps both', '{"status": "pending", "status": "paid"}'),
  ('edge_case', 'whitespace', 'Pretty-printed with tabs, CRLF and trailing spaces', E'{\r\n\t"a" :  1 ,\r\n\t"b":[ 1,\r\n\t\t2 ]   \r\n}'),
  ('edge_case', 'long_string', 'A single 200KB string value', '{"blob": "' || repeat('abcdefghij', 20000) || '"}'),
  ('edge_case', 'wide_object', 'An object with 5,000 keys', (SELECT '{' || string_agg('"field_' || i || '": ' || i, ', ') || '}' FROM generate_series(1, 5000) i)),
  ('edge_case', 'long_array', 'An array with 50,000 numbers', (SELECT '[' || string_agg(i::text, ',') || ']' FROM generate_series(1, 50000) i)),
  ('edge_case', 'html_in_json', 'Markup inside string values', '{"html": "<div class=\"x\"><script>alert(\"xss\")</script></div>", "sql": "SELECT * FROM users WHERE name = ''O''''Brien'';"}'),
  ('edge_case', 'date_strings', 'Dates in every format',
     '{"iso": "2024-02-29T23:59:59.999999Z", "offset": "2024-02-29T23:59:59+05:45", "date_only": "2024-02-29", "us": "02/29/2024", "epoch_s": 1709251199, "epoch_ms": 1709251199999, "rfc2822": "Thu, 29 Feb 2024 23:59:59 +0000"}'),
  ('edge_case', 'base64_in_json', 'Binary data embedded as base64 in a JSON string',
     '{"filename": "pixel.gif", "content_base64": "R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="}'),
  ('edge_case', 'stringified_json', 'JSON encoded as a string inside JSON (double encoded)', '"{\"order_id\": 123, \"items\": [{\"sku\": \"A1\"}]}"');

-- Deeply nested documents (depth 10, 32, 64, 100)
INSERT INTO webhook_events (provider, event_type, description, payload)
SELECT 'edge_case', 'deep_nesting', 'Nested ' || d || ' levels deep', seed.nested_json(d)
FROM unnest(ARRAY[10, 32, 64, 100]) d;

UPDATE webhook_events SET payload = payload_raw::jsonb WHERE payload IS NULL;
UPDATE webhook_events SET payload_raw = payload::text WHERE payload_raw IS NULL;

INSERT INTO webhook_events (account_id, provider, event_type, payload, payload_raw, headers, signature, delivered, attempts, last_error, received_at)
SELECT
  b.account_id,
  b.provider,
  b.event_type,
  b.payload,
  b.payload::text,
  jsonb_build_object(
    'content-type', 'application/json',
    'user-agent', b.provider || '-webhooks/1.0',
    'x-request-id', md5(random()::text),
    'x-signature', 't=' || extract(epoch FROM b.received_at)::bigint || ',v1=' || md5(random()::text)
  ),
  hmac(b.payload::text, 'whsec_' || b.account_id, 'sha256'),
  NOT b.failed,
  CASE WHEN b.failed THEN seed.rand_int(1, 8) ELSE 1 END,
  CASE WHEN b.failed THEN seed.pick(ARRAY[
    'connect ECONNREFUSED 10.0.0.12:443',
    'timeout of 30000ms exceeded',
    E'HTTP 500: <!DOCTYPE html>\n<html><head><title>Internal Server Error</title></head><body><h1>Oops</h1></body></html>',
    'certificate has expired'
  ]) END,
  b.received_at
FROM (
  SELECT
    r.*,
    jsonb_build_object(
      'id', 'evt_' || md5('evt' || r.g),
      'object', 'event',
      'type', r.event_type,
      'api_version', '2024-06-20',
      'created', 1700000000 + r.g,
      'livemode', random() < 0.9,
      'data', jsonb_build_object('object', jsonb_build_object(
        'id', seed.pick(ARRAY['ch_', 'in_', 'sub_', 'cus_']) || substr(md5(random()::text), 1, 24),
        'amount', seed.rand_int(100, 1000000),
        'currency', seed.pick(ARRAY['usd', 'eur', 'gbp', 'jpy']),
        'metadata', CASE WHEN random() < 0.4 THEN jsonb_build_object('order_id', r.g, 'note', seed.pick(seed.intl_strings())) ELSE '{}'::jsonb END,
        'lines', seed.json_of_size(seed.long_tail_size() / 4)
      )),
      'request', jsonb_build_object('id', CASE WHEN random() < 0.5 THEN 'req_' || substr(md5(random()::text), 1, 14) END, 'idempotency_key', NULL)
    ) AS payload
  FROM (
    SELECT
      g,
      1 + (g % 500) AS account_id,
      split_part(kind, ':', 1) AS provider,
      split_part(kind, ':', 2) AS event_type,
      failed,
      received_at
    FROM (
      SELECT
        g,
        seed.pick(ARRAY[
          'stripe:charge.succeeded', 'stripe:invoice.paid', 'stripe:customer.subscription.updated',
          'stripe:payment_intent.payment_failed', 'github:push', 'github:pull_request',
          'shopify:orders/create', 'twilio:message.status'
        ]) AS kind,
        random() < 0.08 AS failed,
        seed.rand_ts(now() - interval '90 days', now()) AS received_at
      FROM generate_series(1, 10000) g
    ) k
  ) r
) b
ORDER BY b.received_at;

UPDATE webhook_events SET signature_hex = encode(signature, 'hex') WHERE signature IS NOT NULL AND id % 2 = 0;

CREATE INDEX webhook_events_payload_idx ON webhook_events USING gin (payload jsonb_path_ops);
CREATE INDEX webhook_events_received_at_idx ON webhook_events USING brin (received_at);

-- ---------------------------------------------------------------------------
-- documents: CMS / knowledge base pages
-- ---------------------------------------------------------------------------

CREATE TABLE documents (
  id bigserial PRIMARY KEY,
  account_id bigint NOT NULL REFERENCES accounts (id),
  author_id bigint REFERENCES users (id),
  parent_id bigint REFERENCES documents (id),
  title text NOT NULL,
  slug text NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  status text NOT NULL DEFAULT 'draft',
  nav_path ltree,
  summary text,
  body_markdown text,
  body_html text,
  blocks jsonb,
  legacy_body json,
  seo jsonb,
  table_of_contents jsonb,
  word_count integer,
  reading_time interval,
  translations hstore,
  search_vector tsvector,
  version integer NOT NULL DEFAULT 1,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN documents.blocks IS 'Rich text editor document tree. Nesting depth varies from 2 to 60.';

INSERT INTO documents (account_id, author_id, title, slug, locale, status, nav_path, summary, body_markdown, blocks, legacy_body, seo, translations, published_at, created_at, updated_at)
SELECT
  1 + (b.g % 500),
  1 + (b.g * 7) % 10000,
  b.title,
  lower(regexp_replace(b.title, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || b.g,
  b.locale,
  seed.pick(ARRAY['draft', 'published', 'published', 'published', 'archived']),
  ('docs.' || seed.pick(ARRAY['getting_started', 'guides', 'api', 'billing', 'security']) || '.' || 'page' || b.g)::ltree,
  seed.maybe(0.7, left(seed.pick(seed.paragraphs()), 200)),
  seed.markdown_of_size(b.size),
  jsonb_build_object(
    'type', 'doc',
    'version', 3,
    'content', (SELECT jsonb_agg(seed.nested_json(seed.rand_int(2, 6))) FROM generate_series(1, greatest(1, b.size / 2000)) i)
  ),
  CASE WHEN random() < 0.2 THEN json_build_object('format', 'wiki-v1', 'html', '<p>' || seed.pick(seed.paragraphs()) || '</p>', 'macros', json_build_array('toc', 'children')) END,
  jsonb_build_object('title', b.title, 'description', NULL, 'og_image', 'https://cdn.example.com/og/' || b.g || '.png', 'canonical', NULL),
  CASE WHEN random() < 0.3 THEN hstore(ARRAY['de', 'fr', 'ja'], ARRAY['/de/' || b.g, '/fr/' || b.g, NULL]) END,
  seed.maybe(0.7, seed.rand_ts(now() - interval '2 years', now())),
  b.created_at,
  seed.rand_ts(b.created_at, now())
FROM (
  SELECT
    g,
    seed.pick(ARRAY['Getting started with', 'How to configure', 'Troubleshooting', 'Migrating from', 'Best practices for', 'FAQ:']) || ' ' || seed.pick(seed.words()) AS title,
    seed.pick(ARRAY['en', 'en', 'en', 'de', 'fr', 'ja', 'pt-BR']) AS locale,
    CASE WHEN random() < 0.02 THEN seed.rand_int(200000, 500000) ELSE seed.rand_int(300, 20000) END AS size,
    seed.rand_ts(now() - interval '3 years', now()) AS created_at
  FROM generate_series(1, 800) g
) b
ORDER BY b.g;

-- A few documents with very deep block trees
UPDATE documents SET blocks = jsonb_build_object('type', 'doc', 'version', 3, 'content', jsonb_build_array(seed.nested_json(60)))
WHERE id IN (7, 77, 777);

UPDATE documents SET
  parent_id = CASE WHEN id > 50 AND id % 5 = 0 THEN id - 1 END,
  body_html = seed.markdown_to_html(body_markdown),
  word_count = array_length(regexp_split_to_array(body_markdown, '\s+'), 1),
  reading_time = make_interval(secs => array_length(regexp_split_to_array(body_markdown, '\s+'), 1) / 4),
  table_of_contents = (
    SELECT coalesce(jsonb_agg(jsonb_build_object('level', length(m[1]), 'text', m[2])), '[]'::jsonb)
    FROM regexp_matches(body_markdown, '(?:^|\n)(#{1,4}) ([^\n]+)', 'g') AS m
  ),
  search_vector = to_tsvector('english', title || ' ' || coalesce(summary, ''));

CREATE INDEX documents_search_idx ON documents USING gin (search_vector);
CREATE UNIQUE INDEX documents_account_slug_locale_idx ON documents (account_id, slug, locale);
