-- Core application tables for a multi-tenant SaaS / commerce product.
-- Runs on every supported version (9.6+).

SET client_min_messages = warning;
SELECT setseed(0.10);

-- ---------------------------------------------------------------------------
-- accounts (tenants)
-- ---------------------------------------------------------------------------

CREATE TABLE accounts (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  name text NOT NULL,
  slug citext NOT NULL UNIQUE,
  status account_status NOT NULL DEFAULT 'trialing',
  plan subscription_plan NOT NULL DEFAULT 'free',
  seats positive_int NOT NULL DEFAULT 1,
  billing_email email_address,
  billing_address postal_address,
  currency currency_code NOT NULL DEFAULT 'USD',
  mrr money_amount,
  industry text,
  employee_count integer,
  website http_url,
  country iso_country,
  timezone text NOT NULL DEFAULT 'UTC',
  feature_flags hstore,
  settings jsonb NOT NULL DEFAULT '{}',
  sso_domains text[],
  trial_period tstzrange,
  owner_user_id bigint,
  stripe_customer_id text,
  tax_id text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE accounts IS 'Tenants. Every other table hangs off an account.';
COMMENT ON COLUMN accounts.mrr IS 'Monthly recurring revenue as a (amount, currency) composite';

INSERT INTO accounts (
  name, slug, status, plan, seats, billing_email, billing_address, currency, mrr, industry,
  employee_count, website, country, timezone, feature_flags, settings, sso_domains, trial_period,
  stripe_customer_id, tax_id, notes, deleted_at, created_at, updated_at
)
SELECT
  b.company,
  lower(regexp_replace(b.company, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || b.g,
  b.status,
  b.plan,
  b.seats,
  'billing+' || b.g || '@' || lower(regexp_replace(b.word, '[^a-zA-Z]', '', 'g')) || '.example.com',
  ROW(b.g * 17 % 999 + 1 || ' ' || seed.pick(ARRAY['Market St', 'Main Street', 'Rue de Rivoli', 'Friedrichstraße', 'King St W', 'Avenida Paulista']),
      CASE WHEN random() < 0.3 THEN 'Suite ' || seed.rand_int(100, 2400) END,
      c.city, c.region, c.postal_code, c.country_code)::postal_address,
  c.currency,
  CASE WHEN b.plan <> 'free' THEN ROW(round((b.seats * seed.pick(ARRAY[12, 29, 49, 99]))::numeric, 4), c.currency)::money_amount END,
  seed.pick(seed.industries()),
  seed.pick(ARRAY[3, 12, 45, 180, 650, 2400, 12000, NULL]),
  'https://www.' || lower(regexp_replace(b.word, '[^a-zA-Z]', '', 'g')) || '.example.com',
  c.country_code,
  c.timezone,
  hstore(ARRAY['beta_reports', 'new_editor', 'ai_assist'], ARRAY[(random() < 0.3)::text, (random() < 0.6)::text, (random() < 0.1)::text]),
  jsonb_build_object(
    'locale', c.locale,
    'week_starts_on', seed.pick(ARRAY['monday', 'sunday']),
    'notifications', jsonb_build_object('digest', seed.pick(ARRAY['daily', 'weekly', 'never']), 'slack_webhook', CASE WHEN random() < 0.4 THEN 'https://hooks.slack.com/services/T000/B000/' || md5(b.g::text) END),
    'security', jsonb_build_object('mfa_required', random() < 0.4, 'session_timeout_minutes', seed.pick(ARRAY[30, 60, 480, 1440]), 'ip_allowlist', CASE WHEN random() < 0.1 THEN '["10.0.0.0/8", "192.168.1.0/24"]'::jsonb ELSE '[]'::jsonb END)
  ),
  CASE WHEN b.plan IN ('business', 'enterprise') THEN ARRAY[lower(regexp_replace(b.word, '[^a-zA-Z]', '', 'g')) || '.example.com'] END,
  tstzrange(b.created_at, b.created_at + interval '14 days'),
  'cus_' || substr(md5('acct' || b.g), 1, 14),
  CASE WHEN random() < 0.4 THEN c.country_code || seed.rand_int(10000000, 99999999) END,
  CASE WHEN random() < 0.2 THEN seed.text_of_size(seed.rand_int(50, 600)) END,
  CASE WHEN b.status = 'cancelled' AND random() < 0.5 THEN b.created_at + interval '400 days' END,
  b.created_at,
  b.created_at + random() * (now() - b.created_at)
FROM (
  SELECT
    g,
    seed.pick(seed.company_words()) AS word,
    seed.pick(seed.company_words()) || ' ' || seed.pick(seed.company_suffixes()) AS company,
    seed.pick(ARRAY['active', 'active', 'active', 'trialing', 'past_due', 'suspended', 'cancelled']::account_status[]) AS status,
    seed.pick(ARRAY['free', 'starter', 'starter', 'growth', 'growth', 'business', 'enterprise']::subscription_plan[]) AS plan,
    seed.rand_int(1, 400) AS seats,
    1 + (g * 7) % 32 AS city_id,
    seed.rand_ts(now() - interval '6 years', now() - interval '30 days') AS created_at
  FROM generate_series(1, 500) g
) b
JOIN seed.cities c ON c.id = b.city_id
ORDER BY b.g;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id bigserial PRIMARY KEY,
  account_id bigint NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  public_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email email_address NOT NULL UNIQUE,
  email_verified_at timestamptz,
  first_name text,
  last_name text,
  display_name text,
  role user_role NOT NULL DEFAULT 'member',
  title text,
  department text,
  org_path ltree,
  manager_id bigint REFERENCES users (id),
  password_hash text,
  mfa_secret bytea,
  recovery_codes text[],
  contact_methods contact_method[],
  phone text,
  locale text DEFAULT 'en-US',
  timezone text,
  avatar bytea,
  avatar_content_type text,
  last_login_at timestamptz,
  last_login_ip inet,
  login_count integer NOT NULL DEFAULT 0,
  failed_login_attempts smallint NOT NULL DEFAULT 0,
  locked_until timestamptz,
  api_scopes text[],
  preferences jsonb,
  metadata hstore,
  is_active boolean NOT NULL DEFAULT true,
  invited_by_id bigint,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO users (
  account_id, email, email_verified_at, first_name, last_name, display_name, role, title, department,
  org_path, password_hash, mfa_secret, recovery_codes, contact_methods, phone, locale, timezone,
  avatar, avatar_content_type, last_login_at, last_login_ip, login_count, failed_login_attempts,
  locked_until, api_scopes, preferences, metadata, is_active, deleted_at, created_at, updated_at
)
SELECT
  b.account_id,
  lower(translate(b.first_name, 'áéíóúüöäåøłçñşıẽễ ''', 'aeiouuoaaolcnsiee')) || '.' ||
    lower(translate(b.last_name, 'áéíóúüöäåøłçñşıẽễ ''', 'aeiouuoaaolcnsiee')) || '.' || b.g || '@example.com',
  CASE WHEN random() < 0.9 THEN b.created_at + interval '5 minutes' END,
  b.first_name,
  b.last_name,
  CASE WHEN random() < 0.15 THEN seed.pick(seed.intl_strings()) ELSE b.first_name || ' ' || left(b.last_name, 1) || '.' END,
  CASE WHEN b.g <= 500 THEN 'owner'::user_role ELSE seed.pick(ARRAY['admin', 'member', 'member', 'member', 'billing', 'read_only', 'guest']::user_role[]) END,
  seed.pick(ARRAY['Engineer', 'Senior Engineer', 'Staff Engineer', 'Data Analyst', 'Product Manager', 'Designer', 'CTO', 'VP Sales', 'Account Executive', 'Support Specialist', NULL]),
  b.department,
  ('acme.' || b.department || '.' || seed.pick(ARRAY['platform', 'growth', 'infra', 'core', 'emea', 'apac']))::ltree,
  '$2b$12$' || substr(translate(encode(gen_random_bytes(40), 'base64'), '+', '.'), 1, 53),
  CASE WHEN random() < 0.35 THEN gen_random_bytes(20) END,
  CASE WHEN random() < 0.35 THEN ARRAY[substr(md5(random()::text), 1, 10), substr(md5(random()::text), 1, 10), substr(md5(random()::text), 1, 10)] END,
  ARRAY[
    ROW('email', 'work' || b.g || '@example.com', true, b.created_at)::contact_method,
    ROW('sms', '+1555' || lpad(seed.rand_int(0, 9999999)::text, 7, '0'), false, NULL)::contact_method
  ],
  CASE WHEN random() < 0.6 THEN '+' || seed.rand_int(1, 99) || ' ' || seed.rand_int(100, 999) || '-' || seed.rand_int(100, 999) || '-' || seed.rand_int(1000, 9999) END,
  seed.pick(ARRAY['en-US', 'en-GB', 'de-DE', 'fr-FR', 'ja-JP', 'pt-BR', 'es-ES', 'zh-CN']),
  seed.pick(ARRAY['America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Kolkata', 'Australia/Sydney', NULL]),
  CASE WHEN b.avatar_kind = 1 THEN (SELECT content FROM seed.binary_fixtures WHERE name = 'png_avatar_blue')
       WHEN b.avatar_kind = 2 THEN (SELECT content FROM seed.binary_fixtures WHERE name = 'png_avatar_orange')
       WHEN b.avatar_kind = 3 THEN (SELECT content FROM seed.binary_fixtures WHERE name = 'gif_pixel') END,
  CASE b.avatar_kind WHEN 1 THEN 'image/png' WHEN 2 THEN 'image/png' WHEN 3 THEN 'image/gif' END,
  CASE WHEN random() < 0.85 THEN seed.rand_ts(b.created_at, now()) END,
  CASE WHEN random() < 0.7 THEN ('10.' || seed.rand_int(0, 255) || '.' || seed.rand_int(0, 255) || '.' || seed.rand_int(1, 254))::inet
       WHEN random() < 0.5 THEN ('2001:db8:' || to_hex(seed.rand_int(0, 65535)) || '::' || to_hex(seed.rand_int(1, 65535)))::inet END,
  seed.rand_int(0, 2000),
  CASE WHEN random() < 0.05 THEN seed.rand_int(1, 10) ELSE 0 END,
  CASE WHEN random() < 0.01 THEN now() + interval '15 minutes' END,
  CASE WHEN random() < 0.2 THEN ARRAY['read:reports', 'write:orders', 'read:customers'] END,
  CASE WHEN random() < 0.8 THEN jsonb_build_object(
    'theme', seed.pick(ARRAY['light', 'dark', 'system']),
    'sidebar_collapsed', random() < 0.3,
    'default_dashboard', seed.rand_int(1, 50),
    'recent_searches', to_jsonb(ARRAY[seed.pick(seed.words()), seed.pick(seed.words())]),
    'table_columns', jsonb_build_object('orders', '["number", "status", "total", "created_at"]'::jsonb)
  ) END,
  CASE WHEN random() < 0.3 THEN hstore(ARRAY['signup_source', 'ab_bucket'], ARRAY[seed.pick(ARRAY['google', 'invite', 'sso', 'api']), seed.pick(ARRAY['a', 'b'])]) END,
  random() < 0.95,
  CASE WHEN random() < 0.03 THEN now() - interval '10 days' END,
  b.created_at,
  seed.rand_ts(b.created_at, now())
FROM (
  SELECT
    g,
    CASE WHEN g <= 500 THEN g ELSE seed.rand_int(1, 500) END AS account_id,
    seed.pick(seed.first_names()) AS first_name,
    seed.pick(seed.last_names()) AS last_name,
    seed.pick(ARRAY['engineering', 'sales', 'support', 'finance', 'marketing', 'ops']) AS department,
    CASE WHEN random() < 0.25 THEN seed.rand_int(1, 3) END AS avatar_kind,
    seed.rand_ts(now() - interval '5 years', now() - interval '1 day') AS created_at
  FROM generate_series(1, 10000) g
) b
ORDER BY b.g;

CREATE INDEX users_account_id_idx ON users (account_id);
CREATE INDEX users_org_path_idx ON users USING gist (org_path);
CREATE INDEX users_name_trgm_idx ON users USING gin ((coalesce(first_name, '') || ' ' || coalesce(last_name, '')) gin_trgm_ops);

UPDATE users u SET manager_id = m.id
FROM users m
WHERE m.account_id = u.account_id AND m.role = 'owner' AND u.role <> 'owner' AND u.id % 3 = 0;

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

ALTER TABLE accounts ADD CONSTRAINT accounts_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES users (id) DEFERRABLE INITIALLY DEFERRED;
UPDATE accounts a SET owner_user_id = u.id FROM users u WHERE u.account_id = a.id AND u.role = 'owner';

-- ---------------------------------------------------------------------------
-- customers: the end customers of each tenant. A typical wide CRM-style table that
-- has grown a column at a time for years. Sparse, many types, ~140 columns.
-- ---------------------------------------------------------------------------

CREATE TABLE customers (
  id bigserial PRIMARY KEY,
  account_id bigint NOT NULL REFERENCES accounts (id),
  public_id uuid NOT NULL DEFAULT gen_random_uuid(),
  external_id text,
  -- identity
  salutation text,
  first_name text,
  middle_name text,
  last_name text,
  suffix text,
  preferred_name text,
  pronouns text,
  date_of_birth date,
  gender text,
  -- contact
  email email_address,
  email_verified boolean,
  secondary_email text,
  phone text,
  mobile_phone text,
  work_phone text,
  fax text,
  contact_methods contact_method[],
  preferred_contact_method text,
  preferred_language text,
  locale text,
  timezone text,
  -- company
  company_name text,
  job_title text,
  department text,
  industry text,
  employee_count integer,
  annual_revenue numeric(18, 2),
  website text,
  linkedin_url text,
  twitter_handle text,
  -- addresses, flattened and as a composite (both exist after a half finished refactor)
  billing_address_line1 text,
  billing_address_line2 text,
  billing_city text,
  billing_region text,
  billing_postal_code text,
  billing_country text,
  shipping_address_line1 text,
  shipping_address_line2 text,
  shipping_city text,
  shipping_region text,
  shipping_postal_code text,
  shipping_country text,
  default_address postal_address,
  location geo_point,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  -- lifecycle
  lifecycle_stage text,
  lead_status text,
  lead_score smallint,
  customer_since date,
  churned_at timestamptz,
  churn_reason text,
  is_vip boolean DEFAULT false,
  is_test_account boolean DEFAULT false,
  is_tax_exempt boolean DEFAULT false,
  tax_id text,
  vat_number text,
  -- consent
  marketing_opt_in boolean,
  marketing_opt_in_at timestamptz,
  sms_opt_in boolean,
  email_unsubscribed_at timestamptz,
  gdpr_consent_at timestamptz,
  ccpa_do_not_sell boolean,
  double_opt_in_confirmed_at timestamptz,
  -- attribution
  acquisition_channel text,
  referrer_url text,
  landing_page text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  gclid text,
  fbclid text,
  first_touch_at timestamptz,
  last_touch_at timestamptz,
  referred_by_customer_id bigint REFERENCES customers (id),
  -- metrics
  lifetime_value numeric(12, 2),
  total_orders integer,
  total_spent numeric(12, 2),
  average_order_value numeric(10, 2),
  total_refunded numeric(12, 2),
  first_order_at timestamptz,
  last_order_at timestamptz,
  last_seen_at timestamptz,
  session_count integer,
  page_views integer,
  nps_score smallint,
  csat_score numeric(3, 2),
  support_ticket_count integer,
  open_ticket_count integer,
  -- loyalty
  loyalty_tier text,
  loyalty_points integer,
  loyalty_points_expire_on date,
  store_credit money_amount,
  gift_card_balance numeric(10, 2),
  -- payments
  default_payment_method text,
  card_brand text,
  card_last4 char(4),
  card_exp_month smallint,
  card_exp_year smallint,
  stripe_customer_id text,
  paypal_payer_id text,
  credit_limit numeric(12, 2),
  payment_terms_days smallint,
  currency currency_code,
  -- free form
  preferences jsonb,
  custom_attributes jsonb,
  tags text[],
  segments text[],
  notes text,
  -- the "custom field" era
  custom_field_1 text,
  custom_field_2 text,
  custom_field_3 text,
  custom_field_4 text,
  custom_field_5 text,
  custom_field_6 text,
  custom_field_7 text,
  custom_field_8 text,
  custom_field_9 text,
  custom_field_10 text,
  custom_field_11 text,
  custom_field_12 text,
  custom_field_13 text,
  custom_field_14 text,
  custom_field_15 text,
  custom_field_16 text,
  custom_field_17 text,
  custom_field_18 text,
  custom_field_19 text,
  custom_field_20 text,
  -- device / tracking
  avatar_url text,
  ip_address inet,
  user_agent text,
  device_type text,
  browser text,
  os text,
  -- import bookkeeping
  source_system text,
  imported_at timestamptz,
  import_batch_id uuid,
  row_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
COMMENT ON TABLE customers IS 'End customers of each tenant. Wide, sparse, and accreted over years.';
COMMENT ON COLUMN customers.custom_field_7 IS 'Was "Region" until 2021, now "Preferred Store". Mixed content.';

INSERT INTO customers (
  account_id, external_id, salutation, first_name, middle_name, last_name, suffix, preferred_name, pronouns,
  date_of_birth, gender, email, email_verified, secondary_email, phone, mobile_phone, work_phone, fax,
  contact_methods, preferred_contact_method, preferred_language, locale, timezone, company_name, job_title,
  department, industry, employee_count, annual_revenue, website, linkedin_url, twitter_handle,
  billing_address_line1, billing_address_line2, billing_city, billing_region, billing_postal_code, billing_country,
  shipping_address_line1, shipping_address_line2, shipping_city, shipping_region, shipping_postal_code, shipping_country,
  default_address, location, latitude, longitude, lifecycle_stage, lead_status, lead_score, customer_since,
  churned_at, churn_reason, is_vip, is_test_account, is_tax_exempt, tax_id, vat_number, marketing_opt_in,
  marketing_opt_in_at, sms_opt_in, email_unsubscribed_at, gdpr_consent_at, ccpa_do_not_sell,
  double_opt_in_confirmed_at, acquisition_channel, referrer_url, landing_page, utm_source, utm_medium,
  utm_campaign, utm_term, utm_content, gclid, fbclid, first_touch_at, last_touch_at, lifetime_value,
  total_orders, total_spent, average_order_value, total_refunded, first_order_at, last_order_at, last_seen_at,
  session_count, page_views, nps_score, csat_score, support_ticket_count, open_ticket_count, loyalty_tier,
  loyalty_points, loyalty_points_expire_on, store_credit, gift_card_balance, default_payment_method, card_brand,
  card_last4, card_exp_month, card_exp_year, stripe_customer_id, paypal_payer_id, credit_limit,
  payment_terms_days, currency, preferences, custom_attributes, tags, segments, notes,
  custom_field_1, custom_field_2, custom_field_3, custom_field_4, custom_field_5, custom_field_6, custom_field_7,
  custom_field_8, custom_field_9, custom_field_10, custom_field_11, custom_field_12, custom_field_13,
  custom_field_14, custom_field_15, custom_field_16, custom_field_17, custom_field_18, custom_field_19,
  custom_field_20, avatar_url, ip_address, user_agent, device_type, browser, os, source_system, imported_at,
  import_batch_id, row_version, created_at, updated_at, deleted_at
)
SELECT
  b.account_id,
  CASE WHEN random() < 0.6 THEN seed.pick(ARRAY['SF-', 'HS-', 'LEGACY-', 'shopify_', '']) || (100000 + b.g) END,
  seed.maybe(0.3, seed.pick(ARRAY['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Mx.', 'Prof.'])),
  b.first_name,
  seed.maybe(0.15, seed.pick(seed.first_names())),
  b.last_name,
  seed.maybe(0.03, seed.pick(ARRAY['Jr.', 'Sr.', 'III', 'PhD', 'MD'])),
  seed.maybe(0.1, left(b.first_name, 3)),
  seed.maybe(0.08, seed.pick(ARRAY['she/her', 'he/him', 'they/them'])),
  seed.maybe(0.4, (date '1950-01-01' + seed.rand_int(0, 20000))),
  seed.maybe(0.3, seed.pick(ARRAY['female', 'male', 'non-binary', 'prefer not to say'])),
  lower(translate(b.first_name || '.' || b.last_name, 'áéíóúüöäåøłçñşıẽễ ''', 'aeiouuoaaolcnsiee')) || b.g || '@' || seed.pick(ARRAY['gmail.com', 'yahoo.co.jp', 'outlook.com', 'example.org', 'web.de', 'proton.me']),
  random() < 0.8,
  seed.maybe(0.1, 'alt.' || b.g || '@example.net'),
  seed.maybe(0.6, '+' || seed.rand_int(1, 99) || ' ' || seed.rand_int(100, 999) || ' ' || seed.rand_int(1000000, 9999999)),
  seed.maybe(0.4, '+1 (555) ' || seed.rand_int(100, 999) || '-' || seed.rand_int(1000, 9999)),
  seed.maybe(0.2, seed.rand_int(100, 999) || '.' || seed.rand_int(100, 999) || '.' || seed.rand_int(1000, 9999) || ' x' || seed.rand_int(10, 999)),
  seed.maybe(0.02, '+1 555 0100'::text),
  CASE WHEN random() < 0.3 THEN ARRAY[ROW('email', 'c' || b.g || '@example.com', true, now())::contact_method] END,
  seed.pick(ARRAY['email', 'phone', 'sms', 'whatsapp', NULL]),
  seed.pick(ARRAY['en', 'en', 'en', 'es', 'fr', 'de', 'ja', 'pt', 'zh', NULL]),
  c.locale,
  c.timezone,
  seed.maybe(0.5, seed.pick(seed.company_words()) || ' ' || seed.pick(seed.company_suffixes())),
  seed.maybe(0.4, seed.pick(ARRAY['CEO', 'Buyer', 'Office Manager', 'Procurement Lead', 'Owner', 'Developer', 'Head of IT'])),
  seed.maybe(0.2, seed.pick(ARRAY['Purchasing', 'IT', 'Finance', 'Operations'])),
  seed.maybe(0.4, seed.pick(seed.industries())),
  seed.maybe(0.3, seed.rand_int(1, 50000)),
  seed.maybe(0.2, round((random() * 50000000)::numeric, 2)),
  seed.maybe(0.3, 'https://' || lower(b.last_name) || '.example.com'),
  seed.maybe(0.2, 'https://www.linkedin.com/in/' || lower(b.first_name) || '-' || lower(b.last_name) || '-' || b.g),
  seed.maybe(0.1, '@' || lower(left(b.first_name, 5)) || b.g),
  b.g % 999 + 1 || ' ' || seed.pick(ARRAY['High St', 'Elm Street', 'Bahnhofstraße', 'Calle Mayor', '中央通り', 'Oak Ave']),
  seed.maybe(0.2, 'Apt ' || seed.rand_int(1, 50)),
  c.city, c.region, c.postal_code, c.country,
  CASE WHEN b.same_shipping THEN b.g % 999 + 1 || ' ' || 'High St' ELSE seed.maybe(0.5, seed.rand_int(1, 500) || ' Warehouse Rd') END,
  NULL,
  CASE WHEN b.same_shipping OR random() < 0.5 THEN c.city END,
  CASE WHEN b.same_shipping OR random() < 0.5 THEN c.region END,
  CASE WHEN b.same_shipping OR random() < 0.5 THEN c.postal_code END,
  CASE WHEN b.same_shipping OR random() < 0.5 THEN c.country END,
  CASE WHEN random() < 0.6 THEN ROW(b.g % 999 + 1 || ' High St', NULL, c.city, c.region, c.postal_code, c.country_code)::postal_address END,
  ROW(c.latitude + (random() - 0.5) / 10, c.longitude + (random() - 0.5) / 10)::geo_point,
  round((c.latitude + (random() - 0.5) / 10)::numeric, 6),
  round((c.longitude + (random() - 0.5) / 10)::numeric, 6),
  seed.pick(ARRAY['subscriber', 'lead', 'marketing_qualified_lead', 'opportunity', 'customer', 'customer', 'evangelist', 'other']),
  seed.maybe(0.5, seed.pick(ARRAY['NEW', 'OPEN', 'IN_PROGRESS', 'UNQUALIFIED', 'ATTEMPTED_TO_CONTACT', 'CONNECTED', 'BAD_TIMING'])),
  seed.rand_int(0, 100),
  b.created_at::date,
  CASE WHEN b.churned THEN seed.rand_ts(b.created_at, now()) END,
  CASE WHEN b.churned THEN seed.pick(ARRAY['price', 'moved to competitor', 'no longer needed', 'poor support', 'other: see notes']) END,
  random() < 0.05,
  random() < 0.01,
  random() < 0.04,
  seed.maybe(0.1, 'TX-' || seed.rand_int(100000, 999999)),
  seed.maybe(0.1, c.country_code || seed.rand_int(100000000, 999999999)),
  random() < 0.55,
  seed.maybe(0.5, seed.rand_ts(b.created_at, now())),
  random() < 0.2,
  seed.maybe(0.1, seed.rand_ts(b.created_at, now())),
  CASE WHEN c.currency = 'EUR' THEN seed.rand_ts(b.created_at, now()) END,
  CASE WHEN c.country_code = 'US' THEN random() < 0.05 END,
  seed.maybe(0.3, seed.rand_ts(b.created_at, now())),
  seed.pick(ARRAY['organic_search', 'paid_search', 'social', 'referral', 'email', 'direct', 'affiliate', 'offline', NULL]),
  seed.maybe(0.4, seed.pick(ARRAY['https://www.google.com/', 'https://news.ycombinator.com/item?id=' || b.g, 'https://t.co/' || substr(md5(b.g::text), 1, 10), 'android-app://com.google.android.gm/'])),
  seed.maybe(0.5, '/' || seed.pick(ARRAY['pricing', 'blog/how-to-scale-postgres', 'features/reports', 'signup?plan=growth&ref=nav', 'lp/black-friday-2024'])),
  seed.maybe(0.4, seed.pick(ARRAY['google', 'facebook', 'newsletter', 'linkedin', 'bing', 'tiktok'])),
  seed.maybe(0.4, seed.pick(ARRAY['cpc', 'email', 'social', 'display', 'affiliate'])),
  seed.maybe(0.4, seed.pick(ARRAY['spring_sale_2024', 'brand_us_exact', 'retargeting-q3', 'Black Friday 2025 🖤', 'webinar_followup'])),
  seed.maybe(0.15, seed.pick(ARRAY['database gui', 'postgres client', 'sql editor free'])),
  seed.maybe(0.15, seed.pick(ARRAY['variant_a', 'hero_video', 'cta_button_green'])),
  seed.maybe(0.1, 'Cj0KCQiA' || md5(random()::text)),
  seed.maybe(0.05, 'IwAR' || md5(random()::text)),
  b.created_at - interval '3 days',
  seed.rand_ts(b.created_at, now()),
  round((b.total_spent * 1.4)::numeric, 2),
  b.total_orders,
  b.total_spent,
  CASE WHEN b.total_orders > 0 THEN round(b.total_spent / b.total_orders, 2) END,
  CASE WHEN random() < 0.1 THEN round((b.total_spent * random() * 0.3)::numeric, 2) ELSE 0 END,
  CASE WHEN b.total_orders > 0 THEN b.created_at + interval '1 day' END,
  CASE WHEN b.total_orders > 0 THEN seed.rand_ts(b.created_at, now()) END,
  seed.rand_ts(b.created_at, now()),
  seed.rand_int(0, 500),
  seed.rand_int(0, 20000),
  seed.maybe(0.2, seed.rand_int(0, 10)::smallint),
  seed.maybe(0.2, round((1 + random() * 4)::numeric, 2)),
  seed.rand_int(0, 30),
  seed.rand_int(0, 3),
  seed.maybe(0.4, seed.pick(ARRAY['bronze', 'silver', 'gold', 'platinum'])),
  seed.maybe(0.4, seed.rand_int(0, 100000)),
  seed.maybe(0.3, current_date + seed.rand_int(-100, 700)),
  CASE WHEN random() < 0.1 THEN ROW(round((random() * 200)::numeric, 4), c.currency)::money_amount END,
  seed.maybe(0.1, round((random() * 300)::numeric, 2)),
  seed.pick(ARRAY['card', 'card', 'paypal', 'bank_transfer', 'invoice', 'apple_pay', NULL]),
  seed.maybe(0.6, seed.pick(ARRAY['visa', 'mastercard', 'amex', 'discover', 'jcb', 'unionpay'])),
  lpad(seed.rand_int(0, 9999)::text, 4, '0'),
  seed.rand_int(1, 12),
  seed.rand_int(2024, 2032),
  seed.maybe(0.7, 'cus_' || substr(md5('c' || b.g), 1, 14)),
  seed.maybe(0.1, upper(substr(md5('pp' || b.g), 1, 13))),
  seed.maybe(0.1, seed.pick(ARRAY[1000, 5000, 25000, 100000])::numeric),
  seed.maybe(0.1, seed.pick(ARRAY[15, 30, 45, 60, 90])::smallint),
  c.currency,
  CASE WHEN random() < 0.7 THEN jsonb_build_object(
    'newsletter', jsonb_build_object('frequency', seed.pick(ARRAY['weekly', 'monthly']), 'topics', '["product", "deals"]'::jsonb),
    'units', seed.pick(ARRAY['metric', 'imperial']),
    'gift_wrap', random() < 0.1,
    'delivery_instructions', seed.maybe(0.2, seed.pick(seed.intl_strings()))
  ) END,
  CASE WHEN random() < 0.5 THEN jsonb_build_object(
    'shoe_size', seed.maybe(0.3, seed.rand_int(35, 48)),
    'favorite_category', seed.pick(ARRAY['outdoor', 'kitchen', 'electronics', 'books']),
    'household_size', seed.rand_int(1, 6),
    'pets', to_jsonb(ARRAY[seed.pick(ARRAY['dog', 'cat', 'fish'])]),
    'external_ids', jsonb_build_object('zendesk', seed.rand_int(1000000, 9999999), 'segment_anonymous_id', md5(random()::text)),
    'big_number', 9007199254740993,
    'score_history', to_jsonb(ARRAY[seed.rand_int(0, 100), seed.rand_int(0, 100), seed.rand_int(0, 100)])
  ) END,
  CASE WHEN random() < 0.6 THEN ARRAY[seed.pick(ARRAY['vip', 'wholesale', 'newsletter', 'b2b', 'returning', 'at-risk']), seed.pick(ARRAY['emea', 'na', 'apac'])] END,
  CASE WHEN random() < 0.3 THEN ARRAY['high-value', 'q3-campaign'] END,
  CASE WHEN random() < 0.15 THEN seed.text_of_size(seed.long_tail_size()) END,
  seed.maybe(0.5, seed.pick(ARRAY['Yes', 'No', 'yes', 'Y', 'N/A', 'TBD', ''])),
  seed.maybe(0.4, (current_date - seed.rand_int(0, 2000))::text),
  seed.maybe(0.4, to_char(current_date - seed.rand_int(0, 2000), 'MM/DD/YYYY')),
  seed.maybe(0.3, seed.rand_int(0, 100000)::text),
  seed.maybe(0.3, round((random() * 1000)::numeric, 3)::text),
  seed.maybe(0.3, seed.pick(seed.intl_strings())),
  seed.maybe(0.3, seed.pick(ARRAY['North', 'South', 'EMEA', 'Store #12', 'Store #4 (closed)', 'Online'])),
  seed.maybe(0.2, '{"legacy": true, "id": ' || b.g || '}'),
  seed.maybe(0.2, seed.pick(seed.words())),
  seed.maybe(0.1, seed.text_of_size(seed.rand_int(100, 2000))),
  seed.maybe(0.1, 'see ticket #' || seed.rand_int(1, 8000)),
  seed.maybe(0.05, 'x'::text),
  NULL, NULL, NULL,
  seed.maybe(0.05, repeat('0', seed.rand_int(1, 12))),
  seed.maybe(0.05, E'multi\nline\nvalue'::text),
  seed.maybe(0.02, 'DO NOT USE'::text),
  NULL,
  seed.maybe(0.01, 'deprecated'::text),
  seed.maybe(0.3, 'https://cdn.example.com/avatars/' || md5(b.g::text) || '.jpg'),
  seed.maybe(0.6, ('172.' || seed.rand_int(16, 31) || '.' || seed.rand_int(0, 255) || '.' || seed.rand_int(1, 254))::inet),
  seed.maybe(0.6, seed.pick(ARRAY[
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
  ])),
  seed.pick(ARRAY['desktop', 'mobile', 'tablet', NULL]),
  seed.pick(ARRAY['Chrome', 'Safari', 'Firefox', 'Edge', NULL]),
  seed.pick(ARRAY['macOS', 'Windows', 'iOS', 'Android', 'Linux', NULL]),
  seed.pick(ARRAY['web', 'shopify', 'salesforce', 'csv_import', 'api', 'legacy_mysql']),
  seed.maybe(0.3, seed.rand_ts(b.created_at, now())),
  CASE WHEN random() < 0.3 THEN uuid_generate_v4() END,
  seed.rand_int(1, 40),
  b.created_at,
  seed.rand_ts(b.created_at, now()),
  CASE WHEN random() < 0.02 THEN now() - interval '30 days' END
FROM (
  SELECT
    g,
    1 + (g % 500) AS account_id,
    seed.pick(seed.first_names()) AS first_name,
    seed.pick(seed.last_names()) AS last_name,
    1 + (g * 13) % 32 AS city_id,
    random() < 0.7 AS same_shipping,
    random() < 0.12 AS churned,
    seed.rand_int(0, 40) AS total_orders,
    round((random() * 5000)::numeric, 2) AS total_spent,
    seed.rand_ts(now() - interval '5 years', now() - interval '1 day') AS created_at
  FROM generate_series(1, 20000) g
) b
JOIN seed.cities c ON c.id = b.city_id
ORDER BY b.g;

CREATE INDEX customers_account_id_idx ON customers (account_id);
CREATE INDEX customers_email_idx ON customers (email);
CREATE INDEX customers_tags_idx ON customers USING gin (tags);
CREATE INDEX customers_custom_attributes_idx ON customers USING gin (custom_attributes jsonb_path_ops);
CREATE INDEX customers_active_idx ON customers (account_id, last_order_at DESC) WHERE deleted_at IS NULL;

UPDATE customers SET referred_by_customer_id = id - 1 WHERE id % 37 = 0;

CREATE TRIGGER customers_set_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------

CREATE TABLE products (
  id bigserial PRIMARY KEY,
  account_id bigint NOT NULL REFERENCES accounts (id),
  sku text NOT NULL,
  barcode text,
  name text NOT NULL,
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  product_type text,
  brand text,
  vendor text,
  category_path ltree,
  tags text[],
  short_description text,
  description text,
  description_html text,
  price money_amount NOT NULL,
  compare_at_price numeric(12, 2),
  cost numeric(12, 4),
  tax_code text,
  is_taxable boolean NOT NULL DEFAULT true,
  requires_shipping boolean NOT NULL DEFAULT true,
  is_digital boolean NOT NULL DEFAULT false,
  download_url text,
  inventory_quantity integer NOT NULL DEFAULT 0,
  inventory_policy text DEFAULT 'deny',
  low_stock_threshold smallint,
  package package_dimensions,
  hs_code text,
  country_of_origin iso_country,
  warehouse_locations store_location[],
  attributes jsonb,
  variants jsonb,
  images jsonb,
  seo jsonb,
  option_names text[],
  option_matrix text[][],
  thumbnail bytea,
  rating numeric(2, 1),
  review_count integer DEFAULT 0,
  price_band numrange,
  weight_tolerance floatrange,
  available_during tstzrange,
  search_vector tsvector,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, sku)
);

INSERT INTO products (
  account_id, sku, barcode, name, slug, status, product_type, brand, vendor, category_path, tags,
  short_description, description, description_html, price, compare_at_price, cost, tax_code, is_taxable,
  requires_shipping, is_digital, download_url, inventory_quantity, inventory_policy, low_stock_threshold,
  package, hs_code, country_of_origin, warehouse_locations, attributes, variants, images, seo, option_names,
  option_matrix, thumbnail, rating, review_count, price_band, weight_tolerance, available_during,
  published_at, created_at, updated_at
)
SELECT
  b.account_id,
  upper(left(b.category, 3)) || '-' || lpad(b.g::text, 6, '0'),
  CASE WHEN random() < 0.8 THEN lpad((b.g * 104729 % 1000000000000)::text, 13, '0') END,
  b.adjective || ' ' || b.noun,
  lower(b.adjective || '-' || b.noun || '-' || b.g),
  seed.pick(ARRAY['draft', 'active', 'active', 'active', 'archived']),
  b.category,
  seed.pick(seed.company_words()),
  seed.maybe(0.5, seed.pick(seed.company_words()) || ' ' || seed.pick(seed.company_suffixes())),
  ('catalog.' || b.category || '.' || seed.pick(ARRAY['new', 'sale', 'core', 'clearance']))::ltree,
  ARRAY[b.category, seed.pick(ARRAY['bestseller', 'eco', 'limited', 'gift'])],
  'A ' || lower(b.adjective) || ' ' || lower(b.noun) || ' for everyday use.',
  seed.markdown_of_size(seed.rand_int(100, 4000)),
  NULL,
  ROW(round((5 + random() * 995)::numeric, 2), seed.pick(ARRAY['USD', 'USD', 'EUR', 'GBP', 'JPY']::currency_code[]))::money_amount,
  seed.maybe(0.3, round((50 + random() * 1000)::numeric, 2)),
  round((2 + random() * 400)::numeric, 4),
  seed.pick(ARRAY['P0000000', 'PC040100', 'PD070113', NULL]),
  random() < 0.9,
  b.category <> 'software',
  b.category = 'software',
  CASE WHEN b.category = 'software' THEN 'https://downloads.example.com/' || md5(b.g::text) || '.zip' END,
  seed.rand_int(-5, 5000),
  seed.pick(ARRAY['deny', 'continue']),
  seed.maybe(0.5, seed.rand_int(1, 50)::smallint),
  ROW(round((random() * 100)::numeric, 2), round((random() * 80)::numeric, 2), round((random() * 50)::numeric, 2), round((random() * 30)::numeric, 3))::package_dimensions,
  seed.maybe(0.6, seed.rand_int(1000, 9999) || '.' || seed.rand_int(10, 99)),
  seed.pick(ARRAY['US', 'CN', 'DE', 'JP', 'VN', 'MX', 'IT']),
  CASE WHEN random() < 0.4 THEN ARRAY[
    ROW('Main warehouse', ROW('1 Dock Rd', NULL, 'Reno', 'NV', '89501', 'US')::postal_address, ROW(39.5296, -119.8138)::geo_point, ARRAY['Mon-Fri 08:00-18:00'])::store_location,
    ROW('EU hub', ROW('Industrieweg 4', 'Hal 2', 'Venlo', 'Limburg', '5928 PH', 'NL')::postal_address, ROW(51.3704, 6.1724)::geo_point, ARRAY['Mon-Sat 07:00-22:00', 'Sun closed'])::store_location
  ] END,
  jsonb_build_object(
    'color', seed.pick(ARRAY['red', 'navy', 'forest green', 'off-white', 'charcoal']),
    'material', seed.pick(ARRAY['cotton', 'steel', 'recycled plastic', 'oak', 'aluminium']),
    'size', seed.pick(ARRAY['XS', 'S', 'M', 'L', 'XL', 'One size']),
    'certifications', to_jsonb(ARRAY[seed.pick(ARRAY['CE', 'FCC', 'RoHS', 'FSC'])]),
    'specs', jsonb_build_object('watts', seed.maybe(0.3, seed.rand_int(5, 2000)), 'voltage', seed.maybe(0.3, '110-240V'::text))
  ),
  (SELECT jsonb_agg(jsonb_build_object(
      'id', b.g * 100 + v,
      'sku', upper(left(b.category, 3)) || '-' || lpad(b.g::text, 6, '0') || '-' || v,
      'option1', seed.pick(ARRAY['S', 'M', 'L']),
      'option2', seed.pick(ARRAY['red', 'blue', 'black']),
      'price', round((5 + random() * 995)::numeric, 2),
      'inventory', seed.rand_int(0, 200)))
   FROM generate_series(1, b.variant_count) v),
  jsonb_build_array(
    jsonb_build_object('url', 'https://cdn.example.com/p/' || b.g || '/1.jpg', 'alt', b.adjective || ' ' || b.noun, 'width', 1200, 'height', 1200),
    jsonb_build_object('url', 'https://cdn.example.com/p/' || b.g || '/2.jpg', 'alt', NULL, 'width', 800, 'height', 600)
  ),
  jsonb_build_object('title', b.adjective || ' ' || b.noun || ' | Shop', 'description', NULL, 'noindex', random() < 0.05),
  ARRAY['Size', 'Color'],
  ARRAY[['S', 'red'], ['M', 'blue'], ['L', 'black']],
  CASE WHEN random() < 0.3 THEN (SELECT content FROM seed.binary_fixtures WHERE name = 'png_thumb_green') END,
  seed.maybe(0.7, round((1 + random() * 4)::numeric, 1)),
  seed.rand_int(0, 5000),
  numrange(round((random() * 100)::numeric, 2), round((100 + random() * 900)::numeric, 2), '[)'),
  floatrange(0.95, 1.05),
  CASE WHEN random() < 0.2 THEN tstzrange(now() - interval '30 days', now() + interval '30 days')
       WHEN random() < 0.1 THEN tstzrange(now(), NULL) END,
  seed.maybe(0.8, seed.rand_ts(now() - interval '3 years', now())),
  b.created_at,
  seed.rand_ts(b.created_at, now())
FROM (
  SELECT
    g,
    1 + (g % 500) AS account_id,
    seed.pick(ARRAY['Ergonomic', 'Rustic', 'Smart', 'Handcrafted', 'Refurbished', 'Wireless', 'Organic', 'Heavy Duty', 'Compact', 'Premium']) AS adjective,
    seed.pick(ARRAY['Chair', 'Keyboard', 'Backpack', 'Lamp', 'Water Bottle', 'Desk', 'Headphones', 'Notebook', 'Monitor Arm', 'Coffee Grinder']) AS noun,
    seed.pick(ARRAY['furniture', 'electronics', 'outdoor', 'kitchen', 'office', 'software']) AS category,
    seed.rand_int(1, 8) AS variant_count,
    seed.rand_ts(now() - interval '4 years', now()) AS created_at
  FROM generate_series(1, 2000) g
) b
ORDER BY b.g;

UPDATE products SET
  description_html = seed.markdown_to_html(description),
  search_vector = setweight(to_tsvector('english', name), 'A') || setweight(to_tsvector('english', coalesce(description, '')), 'B');

CREATE INDEX products_search_idx ON products USING gin (search_vector);
CREATE INDEX products_attributes_idx ON products USING gin (attributes);
CREATE INDEX products_category_path_idx ON products USING gist (category_path);
CREATE INDEX products_name_lower_idx ON products (lower(name));

-- ---------------------------------------------------------------------------
-- orders + order_items
-- ---------------------------------------------------------------------------

CREATE SEQUENCE order_number_seq START 100000;

CREATE TABLE orders (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_number text NOT NULL DEFAULT 'ORD-' || nextval('order_number_seq'),
  account_id bigint NOT NULL REFERENCES accounts (id),
  customer_id bigint REFERENCES customers (id),
  status order_status NOT NULL DEFAULT 'draft',
  status_history order_status[],
  workflow workflow_stage,
  currency currency_code NOT NULL,
  subtotal numeric(12, 2) NOT NULL,
  discount_total numeric(12, 2) NOT NULL DEFAULT 0,
  shipping_total numeric(12, 2) NOT NULL DEFAULT 0,
  tax_total numeric(12, 2) NOT NULL DEFAULT 0,
  total numeric(12, 2) NOT NULL,
  total_in_usd money,
  exchange_rate double precision,
  discount_codes text[],
  billing_address postal_address,
  shipping_address postal_address,
  shipping_method text,
  tracking_numbers text[],
  shipped_at timestamptz,
  delivered_at timestamptz,
  delivery_window tstzrange,
  cancelled_at timestamptz,
  cancel_reason text,
  payment_gateway text,
  payment_reference text,
  risk_score real,
  ip_address inet,
  user_agent text,
  customer_note text,
  gift_message text,
  line_items_snapshot jsonb,
  payment_details jsonb,
  attribution json,
  metadata jsonb,
  placed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_total_check CHECK (total >= 0)
);
COMMENT ON COLUMN orders.attribution IS 'Plain json (not jsonb): key order, whitespace and duplicate keys are preserved';

INSERT INTO orders (
  account_id, customer_id, status, status_history, workflow, currency, subtotal, discount_total, shipping_total, tax_total,
  total, total_in_usd, exchange_rate, discount_codes, billing_address, shipping_address, shipping_method,
  tracking_numbers, shipped_at, delivered_at, delivery_window, cancelled_at, cancel_reason, payment_gateway,
  payment_reference, risk_score, ip_address, user_agent, customer_note, gift_message, line_items_snapshot,
  payment_details, attribution, metadata, placed_at, created_at, updated_at
)
SELECT
  cu.account_id,
  cu.id,
  b.status,
  CASE WHEN b.status IN ('draft', 'pending_payment') THEN ARRAY[b.status]
       ELSE ARRAY['pending_payment', 'paid', b.status]::order_status[] END,
  seed.maybe(0.3, seed.pick(enum_range(NULL::workflow_stage))),
  cu.currency,
  b.subtotal,
  round(b.subtotal * b.discount_pct, 2),
  b.shipping,
  round(b.subtotal * 0.0825, 2),
  b.subtotal - round(b.subtotal * b.discount_pct, 2) + b.shipping + round(b.subtotal * 0.0825, 2),
  (b.subtotal - round(b.subtotal * b.discount_pct, 2) + b.shipping)::numeric::money,
  CASE WHEN cu.currency = 'USD' THEN 1 ELSE 0.5 + random() END,
  CASE WHEN round(b.subtotal * b.discount_pct, 2) > 0 THEN ARRAY[seed.pick(ARRAY['WELCOME10', 'BFCM2025', 'FREESHIP', 'VIP-20', 'SORRY-FOR-THE-DELAY'])] END,
  cu.default_address,
  CASE WHEN random() < 0.9 THEN cu.default_address
       ELSE ROW('c/o Front Desk', 'Building 7, Floor 3', cu.shipping_city, NULL, NULL, 'US')::postal_address END,
  seed.pick(ARRAY['standard', 'express', 'overnight', 'pickup', 'freight']),
  CASE WHEN b.status IN ('shipped', 'delivered') THEN ARRAY['1Z' || upper(substr(md5(random()::text), 1, 16))] END,
  CASE WHEN b.status IN ('shipped', 'delivered') THEN b.placed_at + interval '2 days' END,
  CASE WHEN b.status = 'delivered' THEN b.placed_at + interval '5 days' END,
  tstzrange(b.placed_at + interval '3 days', b.placed_at + interval '7 days'),
  CASE WHEN b.status = 'cancelled' THEN b.placed_at + interval '1 hour' END,
  CASE WHEN b.status = 'cancelled' THEN seed.pick(ARRAY['customer', 'fraud', 'inventory', 'declined', 'other']) END,
  seed.pick(ARRAY['stripe', 'adyen', 'paypal', 'braintree', 'manual']),
  'pi_' || substr(md5(random()::text), 1, 24),
  seed.maybe(0.9, (random() * 100)::real),
  cu.ip_address,
  cu.user_agent,
  seed.maybe(0.08, seed.pick(ARRAY['Please leave at the back door', 'Ring twice!', 'お届け時間の指定をお願いします', 'Gift — do not include invoice', E'Line 1\nLine 2'])),
  seed.maybe(0.03, 'Happy birthday! 🎂 Love, ' || seed.pick(seed.first_names())),
  (SELECT jsonb_agg(jsonb_build_object('sku', 'SKU-' || i, 'qty', seed.rand_int(1, 3), 'price', round((random() * 200)::numeric, 2))) FROM generate_series(1, seed.rand_int(1, 4)) i),
  jsonb_build_object(
    'method', seed.pick(ARRAY['card', 'paypal', 'klarna', 'ideal', 'sepa_debit']),
    'card', jsonb_build_object('brand', cu.card_brand, 'last4', cu.card_last4, 'three_d_secure', random() < 0.4),
    'captured', b.status NOT IN ('draft', 'pending_payment'),
    'gateway_response', jsonb_build_object('code', seed.pick(ARRAY['00', '05', '51', '91']), 'avs', 'Y', 'cvv', 'M')
  ),
  ('{"source": "' || coalesce(cu.utm_source, 'direct') || '", "medium": "' || coalesce(cu.utm_medium, 'none') || '",  "source": "duplicate key kept by json", "ts": ' || extract(epoch FROM b.placed_at)::bigint || '}')::json,
  CASE WHEN random() < 0.5 THEN jsonb_build_object('channel', seed.pick(ARRAY['web', 'ios', 'android', 'pos', 'api']), 'app_version', seed.pick(ARRAY['4.1.0', '4.2.3', '5.0.0-beta.2']), 'experiment', seed.maybe(0.3, 'checkout_v2'::text)) END,
  b.placed_at,
  b.placed_at,
  b.placed_at + interval '1 hour'
FROM (
  SELECT
    g,
    1 + (g * 7) % 20000 AS customer_id,
    seed.pick(ARRAY['paid', 'fulfilling', 'shipped', 'delivered', 'delivered', 'delivered', 'cancelled', 'refunded', 'pending_payment', 'draft']::order_status[]) AS status,
    round((10 + random() * 990)::numeric, 2) AS subtotal,
    CASE WHEN random() < 0.2 THEN round((random() * 0.3)::numeric, 2) ELSE 0 END AS discount_pct,
    seed.pick(ARRAY[0, 4.99, 9.99, 24.99])::numeric(12, 2) AS shipping,
    seed.rand_ts(now() - interval '3 years', now()) AS placed_at
  FROM generate_series(1, 40000) g
) b
JOIN customers cu ON cu.id = b.customer_id
ORDER BY b.placed_at;

CREATE INDEX orders_account_placed_idx ON orders (account_id, placed_at DESC);
CREATE INDEX orders_customer_id_idx ON orders (customer_id);
CREATE INDEX orders_status_idx ON orders (status) WHERE status NOT IN ('delivered', 'cancelled');
CREATE INDEX orders_metadata_idx ON orders USING gin (metadata);

CREATE TABLE order_items (
  id bigserial PRIMARY KEY,
  order_id bigint NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id bigint REFERENCES products (id) ON DELETE SET NULL,
  line_number smallint NOT NULL,
  sku text NOT NULL,
  title text NOT NULL,
  variant_title text,
  quantity positive_int NOT NULL,
  unit_price numeric(12, 2) NOT NULL,
  discount_amount numeric(12, 2) NOT NULL DEFAULT 0,
  tax_rate percentage,
  tax_lines jsonb,
  properties jsonb,
  fulfillment_status text,
  UNIQUE (order_id, line_number)
);

INSERT INTO order_items (order_id, product_id, line_number, sku, title, variant_title, quantity, unit_price, discount_amount, tax_rate, tax_lines, properties, fulfillment_status)
SELECT
  o.id,
  p.id,
  li.n,
  p.sku,
  p.name,
  seed.maybe(0.5, seed.pick(ARRAY['S / red', 'M / blue', 'L / black', 'One size'])),
  seed.rand_int(1, 5),
  (p.price).amount,
  CASE WHEN random() < 0.1 THEN round((random() * 10)::numeric, 2) ELSE 0 END,
  seed.pick(ARRAY[0, 5, 7.5, 8.25, 19, 20, 21])::numeric,
  jsonb_build_array(jsonb_build_object('title', seed.pick(ARRAY['State Tax', 'VAT', 'GST', 'MwSt.']), 'rate', 0.0825, 'price', round((random() * 20)::numeric, 2))),
  CASE WHEN random() < 0.05 THEN jsonb_build_object('engraving', seed.pick(seed.intl_strings())) END,
  seed.pick(ARRAY['fulfilled', 'unfulfilled', 'partial', NULL])
FROM orders o
CROSS JOIN LATERAL generate_series(1, 1 + (o.id % 4)::int) AS li(n)
JOIN products p ON p.id = 1 + ((o.id * 31 + li.n * 17) % 2000);

CREATE INDEX order_items_product_id_idx ON order_items (product_id);
