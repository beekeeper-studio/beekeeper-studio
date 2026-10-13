-- Generated columns and identity columns.
-- Requires PostgreSQL 12+ (stored generated columns).

SET client_min_messages = warning;

ALTER TABLE customers
  ADD COLUMN full_name text GENERATED ALWAYS AS (trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))) STORED;

ALTER TABLE order_items
  ADD COLUMN line_total numeric(12, 2) GENERATED ALWAYS AS (quantity * unit_price - discount_amount) STORED;

CREATE TABLE api_keys (
  id bigint GENERATED ALWAYS AS IDENTITY (START WITH 1000 INCREMENT BY 10) PRIMARY KEY,
  account_id bigint NOT NULL REFERENCES accounts (id),
  created_by_id bigint REFERENCES users (id),
  label text,
  prefix text NOT NULL,
  key_hash bytea NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  is_revoked boolean GENERATED ALWAYS AS (revoked_at IS NOT NULL) STORED,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE api_keys IS 'Identity primary key with custom sequence options, and a generated column.';

INSERT INTO api_keys (account_id, created_by_id, label, prefix, key_hash, scopes, last_used_at, revoked_at)
SELECT
  1 + (g % 500),
  1 + (g * 7) % 10000,
  (ARRAY['CI', 'Zapier', 'Production backend', 'Local dev', NULL])[1 + g % 5],
  'sk_live_' || substr(md5('ak' || g), 1, 6),
  digest('secret-' || g, 'sha256'),
  ARRAY['read', CASE WHEN g % 3 = 0 THEN 'write' ELSE 'read:reports' END],
  CASE WHEN g % 4 <> 0 THEN now() - g * interval '37 minutes' END,
  CASE WHEN g % 10 = 0 THEN now() - interval '30 days' END
FROM generate_series(1, 1500) g;
