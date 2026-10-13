-- Extensions, schemas, custom types and the throwaway helpers used to generate data.
-- Runs on every supported version (9.6+).

SET client_min_messages = warning;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS hstore;
CREATE EXTENSION IF NOT EXISTS ltree;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SCHEMA crm;
COMMENT ON SCHEMA crm IS 'Tables synced from a CRM by an ETL tool. Very wide and mostly NULL.';
CREATE SCHEMA analytics;
COMMENT ON SCHEMA analytics IS 'High volume, partitioned event data.';

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE account_status AS ENUM ('trialing', 'active', 'past_due', 'suspended', 'cancelled');
CREATE TYPE subscription_plan AS ENUM ('free', 'starter', 'growth', 'business', 'enterprise');
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'billing', 'read_only', 'guest');
CREATE TYPE order_status AS ENUM (
  'draft', 'pending_payment', 'paid', 'fulfilling', 'shipped', 'delivered',
  'cancelled', 'refunded', 'partially_refunded'
);
CREATE TYPE ticket_status AS ENUM ('new', 'open', 'pending', 'on_hold', 'solved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE currency_code AS ENUM (
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL',
  'MXN', 'SEK', 'NOK', 'DKK', 'PLN', 'ZAR', 'SGD', 'HKD', 'NZD', 'KRW'
);
-- Labels that came straight from a UI: spaces, quotes, punctuation, emoji, non-latin scripts.
CREATE TYPE workflow_stage AS ENUM (
  'Backlog', 'In Progress', 'Won''t Fix', 'Ready for QA', 'Blocked (external)', '✅ Done', 'Заблокировано'
);
COMMENT ON TYPE workflow_stage IS 'Enum labels that need quoting: spaces, apostrophes, emoji, Cyrillic.';

-- ---------------------------------------------------------------------------
-- Composite types (including a nested one)
-- ---------------------------------------------------------------------------

CREATE TYPE postal_address AS (
  line1 text,
  line2 text,
  city text,
  region text,
  postal_code text,
  country_code char(2)
);
CREATE TYPE money_amount AS (amount numeric(19, 4), currency currency_code);
CREATE TYPE geo_point AS (latitude double precision, longitude double precision);
CREATE TYPE package_dimensions AS (
  length_cm numeric(8, 2),
  width_cm numeric(8, 2),
  height_cm numeric(8, 2),
  weight_kg numeric(8, 3)
);
CREATE TYPE contact_method AS (kind text, value text, is_primary boolean, verified_at timestamptz);
CREATE TYPE store_location AS (
  name text,
  address postal_address,
  coordinates geo_point,
  opening_hours text[]
);

-- ---------------------------------------------------------------------------
-- Domains and ranges
-- ---------------------------------------------------------------------------

CREATE DOMAIN email_address AS citext CHECK (VALUE ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');
CREATE DOMAIN percentage AS numeric(5, 2) CHECK (VALUE BETWEEN 0 AND 100);
CREATE DOMAIN positive_int AS integer CHECK (VALUE > 0);
CREATE DOMAIN http_url AS text CHECK (VALUE ~ '^https?://');
CREATE DOMAIN iso_country AS char(2) CHECK (VALUE ~ '^[A-Z]{2}$');
CREATE DOMAIN sha256_digest AS bytea CHECK (octet_length(VALUE) = 32);

CREATE TYPE floatrange AS RANGE (subtype = float8, subtype_diff = float8mi);

-- ---------------------------------------------------------------------------
-- Shared trigger function
-- ---------------------------------------------------------------------------

CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

-- ---------------------------------------------------------------------------
-- Seed helpers. Everything in the seed schema is dropped by 99_finish.sql.
-- ---------------------------------------------------------------------------

CREATE SCHEMA seed;

CREATE FUNCTION seed.pick(anyarray) RETURNS anyelement LANGUAGE sql VOLATILE AS $$
  SELECT $1[1 + floor(random() * array_length($1, 1))::int]
$$;

CREATE FUNCTION seed.rand_int(lo int, hi int) RETURNS int LANGUAGE sql VOLATILE AS $$
  SELECT lo + floor(random() * (hi - lo + 1))::int
$$;

CREATE FUNCTION seed.rand_ts(t0 timestamptz, t1 timestamptz) RETURNS timestamptz LANGUAGE sql VOLATILE AS $$
  SELECT t0 + random() * (t1 - t0)
$$;

CREATE FUNCTION seed.maybe(p float8, val anyelement) RETURNS anyelement LANGUAGE sql VOLATILE AS $$
  SELECT CASE WHEN random() < p THEN val END
$$;

-- Byte size for a text/JSON value: mostly small, with a long tail.
--  5% empty, 65% < 500B, 25% 1-20KB, 4.8% 20-200KB, 0.2% 1-2MB
CREATE FUNCTION seed.long_tail_size() RETURNS int LANGUAGE sql VOLATILE AS $$
  SELECT CASE
    WHEN r < 0.05 THEN 0
    WHEN r < 0.70 THEN 20 + floor(random() * 480)::int
    WHEN r < 0.95 THEN 1000 + floor(random() * 19000)::int
    WHEN r < 0.998 THEN 20000 + floor(random() * 180000)::int
    ELSE 1000000 + floor(random() * 1000000)::int
  END
  FROM (SELECT random() AS r) s
$$;

CREATE FUNCTION seed.first_names() RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT ARRAY[
    'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth',
    'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen',
    'Wei', 'Fang', 'Hiroshi', 'Yuki', 'Priya', 'Arjun', 'Olusegun', 'Chiamaka', 'Mateo', 'Sofía',
    'Zoë', 'François', 'Jürgen', 'Søren', 'Łukasz', 'Ömer', 'Nguyễn', 'Siobhán', 'José', 'Ana',
    'Mohammed', 'Fatima', 'Aleksandr', 'Olga', 'Kwame', 'Ama', 'Ji-woo', 'Min-jun', 'Lars', 'Ingrid'
  ]
$$;

CREATE FUNCTION seed.last_names() RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT ARRAY[
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Wang', 'Li', 'Tanaka', 'Suzuki', 'Patel', 'Sharma', 'Okafor', 'Adeyemi', 'Müller', 'Schmidt',
    'O''Brien', 'D''Angelo', 'van der Berg', 'de la Cruz', 'Kowalski', 'Nowak', 'Ivanov', 'Petrova', 'Kim', 'Park',
    'Nakamura', 'Fernández', 'Gómez', 'Øvergaard', 'Åberg', 'Çelik', 'Yılmaz', 'Smith-Jones', 'MacDonald', 'Nguyen'
  ]
$$;

CREATE FUNCTION seed.company_words() RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT ARRAY[
    'Acme', 'Globex', 'Initech', 'Umbrella', 'Stark', 'Wayne', 'Hooli', 'Vandelay', 'Soylent', 'Tyrell',
    'Cyberdyne', 'Wonka', 'Gringotts', 'Oscorp', 'Massive Dynamic', 'Aperture', 'Black Mesa', 'Pied Piper',
    'Dunder Mifflin', 'Prestige Worldwide', 'Sterling Cooper', 'Bluth', 'Monarch', 'Nakatomi', 'Weyland',
    'Blue Sun', 'Duff', 'Krusty', 'Contoso', 'Fabrikam', 'Northwind', 'Tailspin', 'Litware', 'Adventure Works'
  ]
$$;

CREATE FUNCTION seed.company_suffixes() RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT ARRAY['Inc.', 'LLC', 'Ltd', 'GmbH', 'S.A.', 'Corp', 'Group', 'Holdings', 'Labs', 'Technologies', 'AG', 'K.K.', 'Pty Ltd', 'B.V.']
$$;

CREATE FUNCTION seed.industries() RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT ARRAY[
    'Software', 'Financial Services', 'Healthcare', 'Retail', 'Manufacturing', 'Education', 'Media',
    'Telecommunications', 'Logistics', 'Real Estate', 'Hospitality', 'Energy', 'Government', 'Non-profit',
    'Biotechnology', 'Insurance', 'Agriculture', 'Automotive', 'Construction', 'Legal'
  ]
$$;

CREATE FUNCTION seed.words() RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT ARRAY[
    'account', 'invoice', 'export', 'dashboard', 'billing', 'sync', 'webhook', 'report', 'integration',
    'permission', 'workspace', 'migration', 'timeout', 'upload', 'checkout', 'refund', 'shipment', 'login',
    'password', 'api', 'token', 'csv', 'filter', 'chart', 'schedule', 'notification', 'email', 'mobile',
    'latency', 'database', 'query', 'cache', 'region', 'quota', 'plan', 'seat', 'license', 'renewal'
  ]
$$;

CREATE FUNCTION seed.paragraphs() RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT ARRAY[
    'Hi team, since this morning none of our scheduled exports have arrived. The dashboard says the job completed successfully but the CSV in the bucket is empty. We have not changed anything on our side. Could you take a look as soon as possible? Our finance team relies on this for month end close.',
    'Thanks for the quick reply. I tried clearing the cache and logging out and back in, but the problem is still there. I have attached a screenshot of the error and the HAR file from Chrome. It seems to happen only for users in the EU workspace.',
    'Following up on this ticket. We are still seeing intermittent 502 responses from the webhook endpoint, roughly once every few hundred requests. Retries usually succeed, but our downstream system does not retry automatically, so we are losing events.',
    'Customer reports that invoices generated after the plan change show the old seat count. Proration looks correct on the subscription but the PDF still lists 25 seats instead of 40. Escalating to billing engineering.',
    'Root cause: a migration added a NOT NULL column without a default, which locked the orders table for about four minutes during peak traffic. We have since rewritten the migration to add the column as nullable, backfill in batches, and then add the constraint.',
    'The new onboarding flow reduced time-to-first-value from 3.2 days to 1.4 days for self-serve accounts. Activation rate for the starter plan increased by 11 percentage points. Enterprise accounts were excluded from the experiment.',
    'Please note the maintenance window this Saturday between 02:00 and 04:00 UTC. During this time the API will return 503 for write operations. Read operations and the web dashboard will remain available, although some reports may be delayed.',
    'I would like to request a feature: the ability to filter the audit log by IP address and export the result. Our security team needs this for SOC 2 evidence collection. Right now we have to copy the rows manually into a spreadsheet.',
    'We are evaluating your product against two competitors. The main questions from our procurement team are around data residency, SSO via Okta, and whether you can sign our DPA without modifications. Pricing for 250 seats would also be helpful.',
    'After upgrading to version 4.2 the mobile app crashes on launch for some Android 12 devices. Crash logs point to a null pointer exception in the push notification handler. iOS users are not affected.',
    'Hola equipo, desde ayer no podemos descargar las facturas en PDF. El botón de descarga no hace nada y la consola del navegador muestra un error 403. ¿Podrían revisarlo? Gracias.',
    'Bonjour, nous avons remarqué que les accents ne s''affichent pas correctement dans les exports CSV ouverts avec Excel. Par exemple « Société Générale » devient « SociÃ©tÃ© GÃ©nÃ©rale ». Pouvez-vous ajouter un BOM UTF-8 ?',
    'こんにちは。昨日から管理画面にログインできません。パスワードをリセットしても同じエラーが表示されます。至急確認をお願いします。',
    '您好，我们的团队在导出报表时遇到问题。导出的文件只有标题行，没有数据。请尽快帮我们查看一下，谢谢。',
    'مرحبا، لا يمكننا تسجيل الدخول إلى الحساب منذ صباح اليوم. تظهر رسالة خطأ عند إدخال كلمة المرور. يرجى المساعدة في أقرب وقت ممكن.',
    'Здравствуйте! После обновления перестала работать интеграция с нашей CRM. Новые сделки не синхронизируются уже второй день. Подскажите, пожалуйста, что можно сделать.',
    'Update from engineering 🚀: the fix has been deployed to production. We backfilled the missing events for the affected window (14:02–14:47 UTC). Let us know if you still see gaps 🙏',
    'Internal note: customer is on a legacy contract with custom SLA terms (99.95% uptime, 4h response for P1). Do NOT apply the standard credit policy without checking with the account manager first.'
  ]
$$;

CREATE FUNCTION seed.markdown_blocks() RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT ARRAY[
    E'## Overview\n\nThis guide explains how to configure **single sign-on** for your workspace. You will need *admin* access and a SAML 2.0 compatible identity provider.',
    E'### Steps\n\n1. Open **Settings → Security**\n2. Click _Configure SSO_\n3. Paste the metadata URL from your identity provider\n4. Map the `email` and `name` attributes\n5. Save and test with a non-admin account',
    E'```sql\nSELECT account_id, count(*) AS active_users\nFROM users\nWHERE last_seen_at > now() - interval ''30 days''\nGROUP BY account_id\nORDER BY active_users DESC\nLIMIT 50;\n```',
    E'```json\n{\n  "event": "order.created",\n  "data": { "id": "ord_123", "total": 4999, "currency": "USD" }\n}\n```',
    E'| Plan | Seats | Price |\n|------|------:|------:|\n| Starter | 5 | $29 |\n| Growth | 25 | $199 |\n| Business | 100 | $699 |\n| Enterprise | Unlimited | Contact us |',
    E'> **Note**\n> Changes to SSO settings apply to all members of the workspace. Users with an active session will be asked to re-authenticate within 24 hours.',
    E'- [x] Verify domain ownership\n- [x] Configure DNS records\n- [ ] Enable enforced SSO\n- [ ] Remove password logins',
    E'![Architecture diagram](https://cdn.example.com/docs/img/architecture-v3.png)\n\nThe ingestion layer writes to a queue, which is drained by a pool of workers into the primary database.',
    E'Our API uses [cursor based pagination](https://example.com/docs/api#pagination). Pass the `next_cursor` value from the previous response as the `cursor` query parameter.',
    E'---\n\n#### Troubleshooting\n\nIf you see `ERR_CERT_AUTHORITY_INVALID`, your network is intercepting TLS. Ask your IT team to allow-list `*.example.com`.'
  ]
$$;

-- Short strings that exercise rendering: scripts, RTL, emoji, combining marks, zero-width characters.
CREATE FUNCTION seed.intl_strings() RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT ARRAY[
    'Café Société', 'Straße', 'naïve façade', 'Øresund Bridge', 'Kraków', 'İstanbul', 'Ελληνικά', 'Москва',
    '東京都渋谷区', '北京市朝阳区', '서울특별시', 'हिन्दी पाठ', 'ภาษาไทย', 'עברית מימין לשמאל', 'العربية من اليمين',
    'Emoji 🎉🚀🔥', 'Family 👩‍👩‍👧‍👦', 'Flags 🇺🇸🇯🇵🇧🇷', 'Skin tones 👋🏽👍🏿', E'Combining é vs precomposed é',
    E'Zero​width​space', E'Tab\tseparated\tvalue', E'Line one\nLine two', '   leading and trailing spaces   ',
    'Quote "double" and ''single''', 'Back\slash \n not a newline', '<script>alert(1)</script>', 'NULL', 'null', ''
  ]
$$;

CREATE FUNCTION seed.text_of_size(target int) RETURNS text LANGUAGE sql VOLATILE AS $$
  SELECT CASE WHEN target <= 0 THEN '' ELSE left(string_agg(seed.pick(seed.paragraphs()), E'\n\n'), target) END
  FROM generate_series(1, greatest(1, target / 250 + 1))
$$;

CREATE FUNCTION seed.markdown_of_size(target int) RETURNS text LANGUAGE sql VOLATILE AS $$
  SELECT string_agg(seed.pick(seed.markdown_blocks()), E'\n\n')
  FROM generate_series(1, greatest(1, target / 200 + 1))
$$;

CREATE FUNCTION seed.markdown_to_html(md text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT '<div class="doc"><p>' || replace(replace(replace(md, '&', '&amp;'), '<', '&lt;'), E'\n\n', E'</p>\n<p>') || '</p></div>'
$$;

-- A JSON array of objects of roughly target bytes. Cheap per element so multi-MB values stay fast.
CREATE FUNCTION seed.json_of_size(target int) RETURNS jsonb LANGUAGE sql VOLATILE AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', o + i,
    'sku', 'SKU-' || lpad(((o + i) * 7919 % 100000)::text, 5, '0'),
    'label', w[1 + (o + i) % n] || ' ' || w[1 + (o + i * 7) % n],
    'qty', 1 + (o + i * 13) % 20,
    'price', round((random() * 500)::numeric, 2),
    'flags', jsonb_build_array(i % 2 = 0, (o + i) % 10 = 0)
  ) ORDER BY i), '[]'::jsonb)
  FROM generate_series(1, target / 130) i,
    (SELECT seed.words() AS w, array_length(seed.words(), 1) AS n, floor(random() * 100000)::int AS o) x
$$;

-- Deeply nested JSON (plpgsql because SQL functions cannot call themselves at creation time).
CREATE FUNCTION seed.nested_json(depth int) RETURNS jsonb LANGUAGE plpgsql VOLATILE AS $$
BEGIN
  IF depth <= 0 THEN
    RETURN jsonb_build_object('leaf', true, 'value', seed.pick(seed.intl_strings()));
  END IF;
  RETURN jsonb_build_object(
    'depth', depth,
    'type', seed.pick(ARRAY['paragraph', 'list', 'list_item', 'blockquote', 'table_cell', 'column']),
    'attrs', jsonb_build_object('id', md5(random()::text), 'align', seed.pick(ARRAY['left', 'center', 'right'])),
    'children', jsonb_build_array(seed.nested_json(depth - 1))
  );
END
$$;

-- Incompressible random bytes of any length (gen_random_bytes is capped at 1024 per call).
CREATE FUNCTION seed.random_bytes(n int) RETURNS bytea LANGUAGE sql VOLATILE AS $$
  SELECT substring(coalesce(string_agg(gen_random_bytes(1024), ''::bytea), ''::bytea) FROM 1 FOR n)
  FROM generate_series(1, (n + 1023) / 1024)
$$;

-- UTF-16 encoders. convert_to() cannot target UTF-16, which is common in files from Windows.
-- Characters outside the Basic Multilingual Plane are written as surrogate pairs.
CREATE FUNCTION seed.utf16(s text, little_endian boolean) RETURNS bytea LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(string_agg(
    CASE WHEN little_endian
      THEN decode(lpad(to_hex(u % 256), 2, '0') || lpad(to_hex(u / 256), 2, '0'), 'hex')
      ELSE decode(lpad(to_hex(u), 4, '0'), 'hex')
    END, ''::bytea ORDER BY ord, part), ''::bytea)
  FROM (
    SELECT ord, 1 AS part, CASE WHEN cp > 65535 THEN 55296 + ((cp - 65536) / 1024) ELSE cp END AS u
    FROM (SELECT ord, ascii(ch) AS cp FROM regexp_split_to_table(s, '') WITH ORDINALITY AS t(ch, ord)) c
    UNION ALL
    SELECT ord, 2, 56320 + ((cp - 65536) % 1024)
    FROM (SELECT ord, ascii(ch) AS cp FROM regexp_split_to_table(s, '') WITH ORDINALITY AS t(ch, ord)) c
    WHERE cp > 65535
  ) units
$$;

CREATE TABLE seed.cities (
  id serial PRIMARY KEY,
  city text,
  region text,
  postal_code text,
  country_code char(2),
  country text,
  latitude double precision,
  longitude double precision,
  timezone text,
  currency currency_code,
  locale text
);

INSERT INTO seed.cities (city, region, postal_code, country_code, country, latitude, longitude, timezone, currency, locale) VALUES
  ('New York', 'NY', '10001', 'US', 'United States', 40.7128, -74.0060, 'America/New_York', 'USD', 'en-US'),
  ('San Francisco', 'CA', '94103', 'US', 'United States', 37.7749, -122.4194, 'America/Los_Angeles', 'USD', 'en-US'),
  ('Austin', 'TX', '73301', 'US', 'United States', 30.2672, -97.7431, 'America/Chicago', 'USD', 'en-US'),
  ('Chicago', 'IL', '60601', 'US', 'United States', 41.8781, -87.6298, 'America/Chicago', 'USD', 'en-US'),
  ('Seattle', 'WA', '98101', 'US', 'United States', 47.6062, -122.3321, 'America/Los_Angeles', 'USD', 'en-US'),
  ('Toronto', 'ON', 'M5H 2N2', 'CA', 'Canada', 43.6532, -79.3832, 'America/Toronto', 'CAD', 'en-CA'),
  ('Montréal', 'QC', 'H2Y 1C6', 'CA', 'Canada', 45.5017, -73.5673, 'America/Toronto', 'CAD', 'fr-CA'),
  ('Ciudad de México', 'CDMX', '06000', 'MX', 'Mexico', 19.4326, -99.1332, 'America/Mexico_City', 'MXN', 'es-MX'),
  ('São Paulo', 'SP', '01000-000', 'BR', 'Brazil', -23.5505, -46.6333, 'America/Sao_Paulo', 'BRL', 'pt-BR'),
  ('London', 'England', 'EC1A 1BB', 'GB', 'United Kingdom', 51.5074, -0.1278, 'Europe/London', 'GBP', 'en-GB'),
  ('Dublin', 'Leinster', 'D02 X285', 'IE', 'Ireland', 53.3498, -6.2603, 'Europe/Dublin', 'EUR', 'en-IE'),
  ('Paris', 'Île-de-France', '75001', 'FR', 'France', 48.8566, 2.3522, 'Europe/Paris', 'EUR', 'fr-FR'),
  ('Berlin', 'Berlin', '10115', 'DE', 'Germany', 52.5200, 13.4050, 'Europe/Berlin', 'EUR', 'de-DE'),
  ('München', 'Bayern', '80331', 'DE', 'Germany', 48.1351, 11.5820, 'Europe/Berlin', 'EUR', 'de-DE'),
  ('Zürich', 'ZH', '8001', 'CH', 'Switzerland', 47.3769, 8.5417, 'Europe/Zurich', 'CHF', 'de-CH'),
  ('Amsterdam', 'Noord-Holland', '1012 JS', 'NL', 'Netherlands', 52.3676, 4.9041, 'Europe/Amsterdam', 'EUR', 'nl-NL'),
  ('Stockholm', 'Stockholm', '111 20', 'SE', 'Sweden', 59.3293, 18.0686, 'Europe/Stockholm', 'SEK', 'sv-SE'),
  ('Oslo', 'Oslo', '0150', 'NO', 'Norway', 59.9139, 10.7522, 'Europe/Oslo', 'NOK', 'nb-NO'),
  ('København', 'Hovedstaden', '1050', 'DK', 'Denmark', 55.6761, 12.5683, 'Europe/Copenhagen', 'DKK', 'da-DK'),
  ('Warszawa', 'Mazowieckie', '00-001', 'PL', 'Poland', 52.2297, 21.0122, 'Europe/Warsaw', 'PLN', 'pl-PL'),
  ('Madrid', 'Madrid', '28001', 'ES', 'Spain', 40.4168, -3.7038, 'Europe/Madrid', 'EUR', 'es-ES'),
  ('Cape Town', 'Western Cape', '8001', 'ZA', 'South Africa', -33.9249, 18.4241, 'Africa/Johannesburg', 'ZAR', 'en-ZA'),
  ('Lagos', 'Lagos', '100001', 'NG', 'Nigeria', 6.5244, 3.3792, 'Africa/Lagos', 'USD', 'en-NG'),
  ('Dubai', 'Dubai', '00000', 'AE', 'United Arab Emirates', 25.2048, 55.2708, 'Asia/Dubai', 'USD', 'ar-AE'),
  ('Bengaluru', 'Karnataka', '560001', 'IN', 'India', 12.9716, 77.5946, 'Asia/Kolkata', 'INR', 'en-IN'),
  ('Singapore', 'Singapore', '018956', 'SG', 'Singapore', 1.3521, 103.8198, 'Asia/Singapore', 'SGD', 'en-SG'),
  ('Hong Kong', 'Hong Kong Island', '999077', 'HK', 'Hong Kong', 22.3193, 114.1694, 'Asia/Hong_Kong', 'HKD', 'zh-HK'),
  ('上海', '上海市', '200000', 'CN', 'China', 31.2304, 121.4737, 'Asia/Shanghai', 'CNY', 'zh-CN'),
  ('東京', '東京都', '100-0001', 'JP', 'Japan', 35.6762, 139.6503, 'Asia/Tokyo', 'JPY', 'ja-JP'),
  ('서울', '서울특별시', '04524', 'KR', 'South Korea', 37.5665, 126.9780, 'Asia/Seoul', 'KRW', 'ko-KR'),
  ('Sydney', 'NSW', '2000', 'AU', 'Australia', -33.8688, 151.2093, 'Australia/Sydney', 'AUD', 'en-AU'),
  ('Auckland', 'Auckland', '1010', 'NZ', 'New Zealand', -36.8485, 174.7633, 'Pacific/Auckland', 'NZD', 'en-NZ');

-- Small but real files (valid magic bytes and structure) used for bytea columns.
CREATE TABLE seed.binary_fixtures (name text PRIMARY KEY, mime_type text, content bytea);

INSERT INTO seed.binary_fixtures (name, mime_type, content) VALUES
  ('png_avatar_blue', 'image/png', decode('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR42mNQTX5NEmIY1TCqYfhqAAB2SXMQ7LkbdQAAAABJRU5ErkJggg==', 'base64')),
  ('png_avatar_orange', 'image/png', decode('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR42mN4FcFDEmIY1TCqYfhqAABvEE4QAQkSFQAAAABJRU5ErkJggg==', 'base64')),
  ('png_thumb_green', 'image/png', decode('iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAIAAADbtmxLAAAAMUlEQVR42u3OQQ0AAAgEoEthKGta1BbOBxsBSE2/EiEhISEhISEhISEhISEhISGhSwszaxJbppmhZgAAAABJRU5ErkJggg==', 'base64')),
  ('gif_pixel', 'image/gif', decode('R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64')),
  ('pdf_invoice', 'application/pdf', decode('JVBERi0xLjQKMSAwIG9iaiA8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4gZW5kb2JqCjIgMCBvYmogPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4gZW5kb2JqCjMgMCBvYmogPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAyMDAgMTAwXSAvQ29udGVudHMgNCAwIFIgL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgNSAwIFIgPj4gPj4gPj4gZW5kb2JqCjQgMCBvYmogPDwgL0xlbmd0aCA0NCA+PiBzdHJlYW0KQlQgL0YxIDE4IFRmIDIwIDUwIFRkIChJbnZvaWNlICMxMDAxKSBUaiBFVAplbmRzdHJlYW0gZW5kb2JqCjUgMCBvYmogPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+IGVuZG9iagp0cmFpbGVyIDw8IC9Sb290IDEgMCBSID4+CiUlRU9GCg==', 'base64')),
  ('gzip_json', 'application/gzip', decode('H4sIAAAAAAAC/6tWSi1LzStRslJQyswry89MTtUrSMxMUdIB8lMgovGGBgaGIIHE3PxSsFITS0tLID+5tKgoNS+5EqSstBisJyczL7UYyI+uVirOLgVJBAT56/r6+4V4+ESCFBSWgJSb1sbWVo/aPGrzqM2jNo/aPGrzqM2jNo9omwE/dztoiAkAAA==', 'base64')),
  ('zip_csv', 'application/zip', decode('UEsDBBQAAAAAAAAAIViKmCVDLAAAACwAAAAKAAAAcmVwb3J0LmNzdmlkLG5hbWUsdG90YWwKMSxBY21lLDEwMC4wMAoyLEdsb2JleCwyNTAuNTAKUEsBAhQDFAAAAAAAAAAhWIqYJUMsAAAALAAAAAoAAAAAAAAAAAAAAIABAAAAAHJlcG9ydC5jc3ZQSwUGAAAAAAEAAQA4AAAAVAAAAAAA', 'base64'));
