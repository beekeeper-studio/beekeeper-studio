-- Very wide tables, generated from field lists so the SQL stays readable.
--   crm.salesforce_accounts  ~350 columns, the shape an ETL tool produces when syncing a CRM object
--   survey_responses         ~470 columns, the shape of a survey tool export, with quoted mixed-case names
-- Runs on every supported version (9.6+).

SET client_min_messages = warning;
SELECT setseed(0.20);

-- ---------------------------------------------------------------------------
-- crm.salesforce_accounts
-- ---------------------------------------------------------------------------

-- fill: fraction of rows with a value. gen: SQL expression for the value (NULL = default for the type).
CREATE TABLE seed.sf_fields (ord serial, name text, typ text, fill float8, gen text);

INSERT INTO seed.sf_fields (name, typ, fill, gen) VALUES
  ('id', 'varchar(18) PRIMARY KEY', 1, $$'001' || upper(substr(md5('sf' || g), 1, 15))$$),
  ('is_deleted', 'boolean', 1, 'random() < 0.02'),
  ('master_record_id', 'varchar(18)', 0.01, $$'001' || upper(substr(md5('m' || g), 1, 15))$$),
  ('name', 'text', 1, $$seed.pick(seed.company_words()) || ' ' || seed.pick(seed.company_suffixes())$$),
  ('type', 'text', 0.9, $$seed.pick(ARRAY['Customer - Direct', 'Customer - Channel', 'Channel Partner / Reseller', 'Prospect', 'Other'])$$),
  ('record_type_id', 'varchar(18)', 0.8, $$'012' || upper(substr(md5('rt' || (g % 3)), 1, 15))$$),
  ('parent_id', 'varchar(18)', 0.1, $$'001' || upper(substr(md5('sf' || (g / 10 + 1)), 1, 15))$$),
  ('billing_street', 'text', 0.8, $$g % 999 || ' ' || seed.pick(ARRAY['Market St', E'Main St\nSuite 400', 'Rue de Rivoli', 'Friedrichstraße'])$$),
  ('billing_city', 'text', 0.8, NULL),
  ('billing_state', 'text', 0.7, NULL),
  ('billing_postal_code', 'text', 0.75, $$lpad(seed.rand_int(0, 99999)::text, 5, '0')$$),
  ('billing_country', 'text', 0.8, $$seed.pick(ARRAY['United States', 'USA', 'US', 'U.S.A.', 'Germany', 'Deutschland', 'Japan', 'United Kingdom'])$$),
  ('billing_state_code', 'text', 0.5, $$seed.pick(ARRAY['CA', 'NY', 'TX', 'WA', 'BY', '13'])$$),
  ('billing_country_code', 'text', 0.5, $$seed.pick(ARRAY['US', 'DE', 'JP', 'GB'])$$),
  ('billing_latitude', 'double precision', 0.3, 'random() * 180 - 90'),
  ('billing_longitude', 'double precision', 0.3, 'random() * 360 - 180'),
  ('billing_geocode_accuracy', 'text', 0.3, $$seed.pick(ARRAY['Address', 'NearAddress', 'Block', 'Street', 'Zip', 'City'])$$),
  ('shipping_street', 'text', 0.5, NULL),
  ('shipping_city', 'text', 0.5, NULL),
  ('shipping_state', 'text', 0.4, NULL),
  ('shipping_postal_code', 'text', 0.4, NULL),
  ('shipping_country', 'text', 0.5, NULL),
  ('shipping_state_code', 'text', 0.3, NULL),
  ('shipping_country_code', 'text', 0.3, NULL),
  ('shipping_latitude', 'double precision', 0.1, NULL),
  ('shipping_longitude', 'double precision', 0.1, NULL),
  ('shipping_geocode_accuracy', 'text', 0.1, NULL),
  ('phone', 'text', 0.7, $$'(' || seed.rand_int(200, 999) || ') ' || seed.rand_int(200, 999) || '-' || seed.rand_int(1000, 9999)$$),
  ('fax', 'text', 0.05, NULL),
  ('account_number', 'text', 0.4, $$'CD' || seed.rand_int(100000, 999999)$$),
  ('website', 'text', 0.7, $$'www.' || lower(seed.pick(ARRAY['acme', 'globex', 'initech', 'hooli'])) || g || '.com'$$),
  ('photo_url', 'text', 0.5, $$'/services/images/photo/001' || upper(substr(md5('sf' || g), 1, 15))$$),
  ('sic', 'text', 0.2, $$seed.rand_int(1000, 9999)::text$$),
  ('industry', 'text', 0.7, 'seed.pick(seed.industries())'),
  ('annual_revenue', 'numeric(18,2)', 0.5, 'round((random() * 5e9)::numeric, -3)'),
  ('number_of_employees', 'integer', 0.6, 'seed.rand_int(1, 250000)'),
  ('ownership', 'text', 0.3, $$seed.pick(ARRAY['Public', 'Private', 'Subsidiary', 'Other'])$$),
  ('ticker_symbol', 'text', 0.1, $$upper(substr(md5(g::text), 1, 4))$$),
  ('description', 'text', 0.4, 'seed.text_of_size(seed.rand_int(50, 3000))'),
  ('rating', 'text', 0.4, $$seed.pick(ARRAY['Hot', 'Warm', 'Cold'])$$),
  ('site', 'text', 0.1, NULL),
  ('currency_iso_code', 'text', 1, $$seed.pick(ARRAY['USD', 'USD', 'EUR', 'GBP', 'JPY'])$$),
  ('owner_id', 'varchar(18)', 1, $$'005' || upper(substr(md5('u' || (g % 40)), 1, 15))$$),
  ('created_date', 'timestamptz', 1, $$seed.rand_ts(now() - interval '8 years', now() - interval '1 year')$$),
  ('created_by_id', 'varchar(18)', 1, $$'005' || upper(substr(md5('u' || (g % 7)), 1, 15))$$),
  ('last_modified_date', 'timestamptz', 1, $$seed.rand_ts(now() - interval '1 year', now())$$),
  ('last_modified_by_id', 'varchar(18)', 1, $$'005' || upper(substr(md5('u' || (g % 11)), 1, 15))$$),
  ('system_modstamp', 'timestamptz', 1, $$seed.rand_ts(now() - interval '1 year', now())$$),
  ('last_activity_date', 'date', 0.6, NULL),
  ('last_viewed_date', 'timestamptz', 0.3, NULL),
  ('last_referenced_date', 'timestamptz', 0.3, NULL),
  ('jigsaw', 'text', 0.02, NULL),
  ('jigsaw_company_id', 'text', 0.02, NULL),
  ('clean_status', 'text', 0.6, $$seed.pick(ARRAY['Pending', 'Matched', 'Different', 'NotFound', 'Inactive', 'SelectMatch', 'Skipped'])$$),
  ('account_source', 'text', 0.5, $$seed.pick(ARRAY['Web', 'Phone Inquiry', 'Partner Referral', 'Purchased List', 'Trade Show', 'Other'])$$),
  ('duns_number', 'text', 0.2, $$lpad(seed.rand_int(0, 999999999)::text, 9, '0')$$),
  ('tradestyle', 'text', 0.05, NULL),
  ('naics_code', 'text', 0.2, $$seed.rand_int(100000, 999999)::text$$),
  ('naics_desc', 'text', 0.2, NULL),
  ('year_started', 'text', 0.2, $$seed.rand_int(1850, 2023)::text$$),
  ('sic_desc', 'text', 0.2, NULL),
  ('dandb_company_id', 'varchar(18)', 0.05, NULL),
  ('operating_hours_id', 'varchar(18)', 0.02, NULL),
  ('customer_priority_c', 'text', 0.4, $$seed.pick(ARRAY['High', 'Medium', 'Low'])$$),
  ('sla_c', 'text', 0.4, $$seed.pick(ARRAY['Gold', 'Silver', 'Platinum', 'Bronze'])$$),
  ('active_c', 'text', 0.6, $$seed.pick(ARRAY['Yes', 'No'])$$),
  ('number_of_locations_c', 'double precision', 0.3, 'seed.rand_int(1, 500)'),
  ('upsell_opportunity_c', 'text', 0.3, $$seed.pick(ARRAY['Maybe', 'No', 'Yes'])$$),
  ('slaserial_number_c', 'text', 0.3, $$seed.rand_int(100, 9999)::text$$),
  ('slaexpiration_date_c', 'date', 0.3, NULL),
  ('_fivetran_synced', 'timestamptz', 1, $$now() - random() * interval '6 hours'$$),
  ('_fivetran_deleted', 'boolean', 1, 'random() < 0.01');

-- Quarterly pipeline columns somebody added every quarter, e.g. q3_2024_bookings_amount_c
INSERT INTO seed.sf_fields (name, typ, fill, gen)
SELECT format('q%s_%s_%s_c', q, y, m), 'numeric(18,2)', 0.25, NULL
FROM generate_series(2021, 2026) y, generate_series(1, 4) q,
  unnest(ARRAY['pipeline_amount', 'bookings_amount', 'forecast_amount', 'quota_attainment_pct']) m
ORDER BY y, q, m;

-- Per product line fields
INSERT INTO seed.sf_fields (name, typ, fill, gen)
SELECT p || '_' || a.name || '_c', a.typ, 0.3, NULL
FROM unnest(ARRAY['analytics', 'crm', 'marketing_cloud', 'service_cloud', 'payments', 'data_warehouse', 'security', 'mobile_sdk']) WITH ORDINALITY AS pr(p, pn),
  (VALUES (1, 'licenses', 'integer'), (2, 'is_active', 'boolean'), (3, 'renewal_date', 'date'),
          (4, 'arr', 'numeric(18,2)'), (5, 'health_score', 'double precision'), (6, 'csm_notes', 'text')) AS a(n, name, typ)
ORDER BY pn, a.n;

-- Enrichment vendors that each wrote their own copy of the same facts
INSERT INTO seed.sf_fields (name, typ, fill, gen)
SELECT v || '_' || a.name || '_c', a.typ, 0.3, a.gen
FROM unnest(ARRAY['zoominfo', 'clearbit', 'sixsense', 'g2', 'bombora']) WITH ORDINALITY AS ve(v, vn),
  (VALUES
    (1, 'company_name', 'text', NULL),
    (2, 'domain', 'text', $$lower(seed.pick(seed.words())) || '.com'$$),
    (3, 'employee_range', 'text', $$seed.pick(ARRAY['1-10', '11-50', '51-200', '201-500', '501-1,000', '1,001-5,000', '10,000+'])$$),
    (4, 'revenue_range', 'text', $$seed.pick(ARRAY['$0-$1M', '$1M-$10M', '$10M-$50M', '$50M-$100M', '$1B+'])$$),
    (5, 'industry', 'text', 'seed.pick(seed.industries())'),
    (6, 'sub_industry', 'text', NULL),
    (7, 'hq_city', 'text', NULL),
    (8, 'hq_country', 'text', NULL),
    (9, 'tech_stack', 'text', $$array_to_string(ARRAY[seed.pick(ARRAY['AWS', 'GCP', 'Azure']), seed.pick(ARRAY['PostgreSQL', 'MySQL', 'Snowflake', 'MongoDB']), seed.pick(ARRAY['React', 'Angular', 'Vue'])], ';')$$),
    (10, 'intent_score', 'integer', 'seed.rand_int(0, 100)'),
    (11, 'last_enriched_at', 'timestamptz', NULL),
    (12, 'linkedin_url', 'text', $$'https://www.linkedin.com/company/' || md5(random()::text)$$)
  ) AS a(n, name, typ, gen)
ORDER BY vn, a.n;

-- Monthly usage snapshots
INSERT INTO seed.sf_fields (name, typ, fill, gen)
SELECT 'usage_' || to_char(m, 'YYYY_MM') || '_c', 'numeric(18,2)', 0.5, NULL
FROM generate_series(date '2023-01-01', date '2025-12-01', interval '1 month') m
ORDER BY m;

-- Attribution
INSERT INTO seed.sf_fields (name, typ, fill, gen)
SELECT t || '_' || a.name || '_c', a.typ, 0.4, a.gen
FROM unnest(ARRAY['first_touch', 'last_touch', 'lead_source']) WITH ORDINALITY AS tt(t, tn),
  (VALUES
    (1, 'utm_source', 'text', $$seed.pick(ARRAY['google', 'linkedin', 'g2', 'newsletter', 'partner'])$$),
    (2, 'utm_medium', 'text', $$seed.pick(ARRAY['cpc', 'email', 'organic', 'referral'])$$),
    (3, 'utm_campaign', 'text', $$seed.pick(ARRAY['brand', 'competitor', 'webinar-2024-q2', 'Retargeting | EMEA'])$$),
    (4, 'utm_content', 'text', NULL),
    (5, 'utm_term', 'text', NULL),
    (6, 'channel', 'text', $$seed.pick(ARRAY['Paid Search', 'Organic Search', 'Events', 'Outbound', 'Partner'])$$),
    (7, 'date', 'date', NULL)
  ) AS a(n, name, typ, gen)
ORDER BY tn, a.n;

-- Fields nobody dares to delete
INSERT INTO seed.sf_fields (name, typ, fill, gen)
SELECT 'zz_deprecated_' || n || '_c', 'text', 0.01, $$'legacy value ' || g$$
FROM generate_series(1, 20) n;

DO $$
DECLARE
  ddl text;
  cols text;
  exprs text;
BEGIN
  SELECT string_agg(format('%I %s', name, typ), E',\n  ' ORDER BY ord),
         string_agg(quote_ident(name), ', ' ORDER BY ord),
         string_agg(
           CASE WHEN fill >= 1 THEN '(' || gen || ')'
           ELSE format('CASE WHEN random() < %s THEN (%s) END', fill, coalesce(gen,
             CASE split_part(typ, ' ', 1)
               WHEN 'text' THEN $g$seed.pick(seed.words()) || ' ' || seed.pick(seed.words())$g$
               WHEN 'boolean' THEN 'random() < 0.5'
               WHEN 'integer' THEN 'seed.rand_int(0, 10000)'
               WHEN 'double' THEN 'random() * 100'
               WHEN 'date' THEN 'current_date - seed.rand_int(0, 2500)'
               WHEN 'timestamptz' THEN $g$seed.rand_ts(now() - interval '5 years', now())$g$
               WHEN 'varchar(18)' THEN $g$'001' || upper(substr(md5(random()::text), 1, 15))$g$
               ELSE 'round((random() * 1000000)::numeric, 2)'
             END))
           END, E',\n  ' ORDER BY ord)
  INTO ddl, cols, exprs
  FROM seed.sf_fields;

  EXECUTE format(E'CREATE TABLE crm.salesforce_accounts (\n  %s\n)', ddl);
  EXECUTE format('INSERT INTO crm.salesforce_accounts (%s) SELECT %s FROM generate_series(1, 3000) g', cols, exprs);
END
$$;

COMMENT ON TABLE crm.salesforce_accounts IS 'CRM Account object synced by an ETL tool. ~350 columns, most of them NULL.';
CREATE INDEX salesforce_accounts_owner_id_idx ON crm.salesforce_accounts (owner_id);
CREATE INDEX salesforce_accounts_synced_idx ON crm.salesforce_accounts (_fivetran_synced);

-- ---------------------------------------------------------------------------
-- survey_responses
-- Column names are exactly what a survey export produces: "Q6_12", "Duration (in seconds)".
-- Later questions are NULL for partial responses, as they would be in the real export.
-- ---------------------------------------------------------------------------

CREATE TABLE seed.survey_fields (ord serial, name text, typ text, gen text, is_question boolean DEFAULT true);

INSERT INTO seed.survey_fields (name, typ, gen, is_question) VALUES
  ('ResponseId', 'text PRIMARY KEY', $$'R_' || substr(md5('resp' || g), 1, 15)$$, false),
  ('StartDate', 'timestamp', 'b.started_at', false),
  ('EndDate', 'timestamp', $$b.started_at + b.duration * interval '1 second'$$, false),
  ('Status', 'text', $$seed.pick(ARRAY['IP Address', 'IP Address', 'IP Address', 'Survey Preview', 'Spam'])$$, false),
  ('IPAddress', 'inet', $$('203.0.113.' || seed.rand_int(1, 254))::inet$$, false),
  ('Progress', 'smallint', 'b.progress', false),
  ('Duration (in seconds)', 'integer', 'b.duration', false),
  ('Finished', 'boolean', 'b.progress = 100', false),
  ('RecordedDate', 'timestamp', $$b.started_at + b.duration * interval '1 second' + interval '2 seconds'$$, false),
  ('RecipientLastName', 'text', $$CASE WHEN b.channel = 'email' THEN seed.pick(seed.last_names()) END$$, false),
  ('RecipientFirstName', 'text', $$CASE WHEN b.channel = 'email' THEN seed.pick(seed.first_names()) END$$, false),
  ('RecipientEmail', 'text', $$CASE WHEN b.channel = 'email' THEN 'respondent' || g || '@example.com' END$$, false),
  ('ExternalReference', 'text', NULL, false),
  ('LocationLatitude', 'numeric(9,6)', 'round((random() * 120 - 50)::numeric, 6)', false),
  ('LocationLongitude', 'numeric(9,6)', 'round((random() * 340 - 170)::numeric, 6)', false),
  ('DistributionChannel', 'text', 'b.channel', false),
  ('UserLanguage', 'text', $$seed.pick(ARRAY['EN', 'EN', 'EN', 'DE', 'FR', 'JA', 'ES-ES', 'PT-BR', 'ZH-S'])$$, false),
  ('Q1', 'text', $$seed.pick(ARRAY['18-24', '25-34', '35-44', '45-54', '55-64', '65+', 'Prefer not to say'])$$, true),
  ('Q2', 'text', $$seed.pick(ARRAY['United States', 'Germany', 'Japan', 'Brazil', 'India', 'Other (please specify)'])$$, true),
  ('Q3', 'text', $$seed.pick(ARRAY['Developer', 'Data Analyst', 'DBA', 'Manager', 'Student', 'Other'])$$, true),
  ('Q4', 'text', $$seed.pick(ARRAY['1', '2-10', '11-50', '51-200', '201-1000', '1000+'])$$, true),
  ('Q5', 'smallint', 'seed.rand_int(0, 20)', true);

-- 16 matrix questions of 25 Likert items each
INSERT INTO seed.survey_fields (name, typ, gen)
SELECT format('Q%s_%s', q, i), 'smallint', 'seed.rand_int(1, 7)'
FROM generate_series(6, 21) q, generate_series(1, 25) i
ORDER BY q, i;

-- "Other, please specify" text entries
INSERT INTO seed.survey_fields (name, typ, gen)
SELECT format('Q%s_TEXT', q), 'text', $$CASE WHEN random() < 0.1 THEN seed.pick(seed.paragraphs()) END$$
FROM unnest(ARRAY[6, 10, 14, 18]) q;

-- Multi-select: 1 when ticked, NULL otherwise
INSERT INTO seed.survey_fields (name, typ, gen)
SELECT format('Q22_%s', i), 'smallint', 'CASE WHEN random() < 0.3 THEN 1 END'
FROM generate_series(1, 20) i;

-- Sliders
INSERT INTO seed.survey_fields (name, typ, gen)
SELECT format('Q23_%s', i), 'numeric(5,2)', 'round((random() * 100)::numeric, 2)'
FROM generate_series(1, 10) i;

INSERT INTO seed.survey_fields (name, typ, gen) VALUES
  ('Q24', 'smallint', 'seed.rand_int(0, 10)'),
  ('Q24_NPS_GROUP', 'text', $$seed.pick(ARRAY['Promoter', 'Passive', 'Detractor'])$$),
  ('Q25', 'text', 'seed.text_of_size(seed.long_tail_size() / 4)');

-- Rank order
INSERT INTO seed.survey_fields (name, typ, gen)
SELECT format('Q26_%s', i), 'smallint', 'seed.rand_int(1, 8)'
FROM generate_series(1, 8) i;

-- Embedded data
INSERT INTO seed.survey_fields (name, typ, gen, is_question) VALUES
  ('utm_source', 'text', $$seed.pick(ARRAY['email', 'in-app', 'twitter', NULL])$$, false),
  ('Segment', 'text', $$seed.pick(ARRAY['SMB', 'Mid-Market', 'Enterprise'])$$, false),
  ('Plan', 'text', $$seed.pick(ARRAY['free', 'starter', 'growth', 'business', 'enterprise'])$$, false),
  ('AccountId', 'bigint', 'seed.rand_int(1, 500)', false);

DO $$
DECLARE
  question_count int;
  ddl text;
  cols text;
  exprs text;
BEGIN
  SELECT count(*) INTO question_count FROM seed.survey_fields WHERE is_question;

  SELECT string_agg(format('%I %s', name, typ), E',\n  ' ORDER BY ord),
         string_agg(quote_ident(name), ', ' ORDER BY ord),
         string_agg(
           CASE
             WHEN gen IS NULL THEN 'NULL'
             WHEN is_question THEN format('CASE WHEN b.progress >= %s THEN (%s) END', ceil(q_ord * 100.0 / question_count), gen)
             ELSE '(' || gen || ')'
           END, E',\n  ' ORDER BY ord)
  INTO ddl, cols, exprs
  FROM (
    SELECT f.*, row_number() OVER (PARTITION BY is_question ORDER BY ord) AS q_ord
    FROM seed.survey_fields f
  ) f;

  EXECUTE format(E'CREATE TABLE survey_responses (\n  %s\n)', ddl);
  EXECUTE format($sql$
    INSERT INTO survey_responses (%s)
    SELECT %s
    FROM (
      SELECT
        g,
        seed.rand_ts(now() - interval '2 years', now())::timestamp AS started_at,
        CASE WHEN random() < 0.75 THEN 100 ELSE seed.rand_int(1, 99) END AS progress,
        seed.rand_int(40, 5400) AS duration,
        seed.pick(ARRAY['anonymous', 'email', 'email', 'social']) AS channel
      FROM generate_series(1, 2500) g
    ) b
  $sql$, cols, exprs);
END
$$;

COMMENT ON TABLE survey_responses IS 'Survey tool export: ~470 columns, quoted mixed-case names, NULLs after the point a respondent stopped.';
