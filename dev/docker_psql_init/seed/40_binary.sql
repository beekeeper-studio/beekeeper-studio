-- Binary data: real file formats, text stored as bytes in many character encodings,
-- and the same bytes represented as bytea, base64 text, hex text and PEM.
-- Runs on every supported version (9.6+).

SET client_min_messages = warning;
SELECT setseed(0.40);

-- Sample text per charset. pg_encoding is the name convert_to() understands; UTF-16 is
-- encoded by seed.utf16() because Postgres has no UTF-16 conversion.
CREATE TABLE seed.charset_samples (id serial PRIMARY KEY, mime_charset text, pg_encoding text, language text, sample text);
INSERT INTO seed.charset_samples (mime_charset, pg_encoding, language, sample) VALUES
  ('utf-8', 'UTF8', 'mixed', 'Thanks! 🙏 Ça marche — 日本語 / 中文 / العربية / ✅'),
  ('iso-8859-1', 'LATIN1', 'German', 'Grüße aus München! Die Rechnung für März ist fällig. Café crème, naïve façade.'),
  ('windows-1252', 'WIN1252', 'English', '“Smart quotes” – en dash — em dash… Total: €1,234.50 ™'),
  ('iso-8859-2', 'LATIN2', 'Polish', 'Zażółć gęślą jaźń. Dziękujemy za wiadomość, odpowiemy wkrótce.'),
  ('shift_jis', 'SJIS', 'Japanese', 'お問い合わせありがとうございます。担当者より折り返しご連絡いたします。'),
  ('euc-jp', 'EUC_JP', 'Japanese', '請求書の件でご連絡いたしました。ご確認をお願いいたします。'),
  ('gb18030', 'GB18030', 'Chinese (Simplified)', '您好，感谢您的来信。我们会尽快回复您。'),
  ('big5', 'BIG5', 'Chinese (Traditional)', '您好，感謝您的來信。我們會盡快回覆您。'),
  ('euc-kr', 'EUC_KR', 'Korean', '안녕하세요. 문의해 주셔서 감사합니다.'),
  ('koi8-r', 'KOI8R', 'Russian', 'Здравствуйте! Спасибо за обращение, мы ответим в ближайшее время.'),
  ('windows-1251', 'WIN1251', 'Russian', 'Счёт за март во вложении. С уважением, бухгалтерия.'),
  ('iso-8859-7', 'ISO_8859_7', 'Greek', 'Καλημέρα σας, ευχαριστούμε για το μήνυμά σας.'),
  ('windows-1255', 'WIN1255', 'Hebrew', 'שלום, תודה על פנייתך. נחזור אליך בהקדם.'),
  ('windows-1256', 'WIN1256', 'Arabic', 'مرحبا، شكرا لتواصلك معنا. سنرد عليك قريبا.'),
  ('utf-16le', 'UTF16LE', 'mixed', 'Report exported from Excel: Größe, 東京, Ñandú'),
  ('utf-16be', 'UTF16BE', 'mixed', 'Legacy Java export: Résumé, Αθήνα, 서울');

CREATE FUNCTION seed.encode_text(s text, pg_encoding text) RETURNS bytea LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE pg_encoding
    WHEN 'UTF16LE' THEN seed.utf16(s, true)
    WHEN 'UTF16BE' THEN seed.utf16(s, false)
    ELSE convert_to(s, pg_encoding)
  END
$$;

-- ---------------------------------------------------------------------------
-- file_attachments
-- ---------------------------------------------------------------------------

CREATE TABLE file_attachments (
  id bigserial PRIMARY KEY,
  account_id bigint NOT NULL REFERENCES accounts (id),
  ticket_id bigint REFERENCES support_tickets (id),
  uploaded_by_id bigint REFERENCES users (id),
  file_name text NOT NULL,
  mime_type text,
  charset text,
  content_encoding text,
  byte_size integer,
  sha256 sha256_digest,
  md5_hex text,
  content bytea,
  thumbnail bytea,
  storage_url text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE file_attachments IS 'Real file formats (PNG, GIF, PDF, gzip, zip), text files in many encodings, random blobs up to ~5MB, an empty file and files stored externally (NULL content).';
COMMENT ON COLUMN file_attachments.content IS 'Raw file bytes. NULL when the file lives in object storage (see storage_url).';

-- Known formats
INSERT INTO file_attachments (account_id, ticket_id, uploaded_by_id, file_name, mime_type, content_encoding, content, metadata)
SELECT
  1 + (g % 500),
  1 + (g * 3) % 5000,
  1 + (g * 7) % 10000,
  CASE f.name
    WHEN 'png_avatar_blue' THEN 'avatar.png'
    WHEN 'png_avatar_orange' THEN 'Profile Photo (1).png'
    WHEN 'png_thumb_green' THEN 'thumbnail@2x.png'
    WHEN 'gif_pixel' THEN 'tracking-pixel.gif'
    WHEN 'pdf_invoice' THEN 'Invoice #1001.pdf'
    WHEN 'gzip_json' THEN 'webhook-payload.json.gz'
    ELSE 'report.zip'
  END,
  f.mime_type,
  CASE WHEN f.name = 'gzip_json' THEN 'gzip' ELSE 'identity' END,
  f.content,
  jsonb_build_object('source', seed.pick(ARRAY['upload', 'email', 'api']), 'scanned', true, 'virus_scan', 'clean')
FROM seed.binary_fixtures f
CROSS JOIN generate_series(1, 15) g
ORDER BY g, f.name;

-- Text files in different encodings, with and without byte order marks
INSERT INTO file_attachments (account_id, ticket_id, file_name, mime_type, charset, content_encoding, content, metadata)
SELECT
  1 + (cs.id % 500),
  1 + (cs.id * 11 + v.n) % 5000,
  'export-' || lower(replace(cs.mime_charset, '-', '')) || CASE v.n WHEN 1 THEN '.csv' ELSE '.txt' END,
  CASE v.n WHEN 1 THEN 'text/csv' ELSE 'text/plain' END,
  cs.mime_charset,
  'identity',
  CASE
    WHEN v.n = 2 AND cs.pg_encoding = 'UTF8' THEN '\xefbbbf'::bytea || seed.encode_text(v.body, cs.pg_encoding)
    WHEN v.n = 2 AND cs.pg_encoding = 'UTF16LE' THEN '\xfffe'::bytea || seed.encode_text(v.body, cs.pg_encoding)
    WHEN v.n = 2 AND cs.pg_encoding = 'UTF16BE' THEN '\xfeff'::bytea || seed.encode_text(v.body, cs.pg_encoding)
    ELSE seed.encode_text(v.body, cs.pg_encoding)
  END,
  jsonb_build_object('language', cs.language, 'has_bom', v.n = 2 AND cs.pg_encoding IN ('UTF8', 'UTF16LE', 'UTF16BE'), 'decoded_preview', left(cs.sample, 40))
FROM seed.charset_samples cs
CROSS JOIN LATERAL (VALUES
  (1, E'id,name,note\r\n1,"' || cs.sample || E'",ok\r\n2,"Second row",\r\n'),
  (2, cs.sample || E'\n')
) AS v(n, body)
ORDER BY cs.id, v.n;

-- Opaque blobs: mostly small, a few large. Random bytes so nothing compresses.
INSERT INTO file_attachments (account_id, ticket_id, uploaded_by_id, file_name, mime_type, content_encoding, content, metadata)
SELECT
  1 + (g % 500),
  CASE WHEN random() < 0.7 THEN 1 + (g * 13) % 5000 END,
  1 + (g * 17) % 10000,
  seed.pick(ARRAY['backup', 'firmware', 'dump', 'model', 'session']) || '-' || g || seed.pick(ARRAY['.bin', '.dat', '.sqlite', '.pb', '.msgpack', '']),
  seed.pick(ARRAY['application/octet-stream', 'application/x-protobuf', 'application/msgpack', 'application/vnd.sqlite3', NULL]),
  'identity',
  seed.random_bytes(CASE
    WHEN g % 100 = 0 THEN 1048576 + (g * 7919) % 4194304
    WHEN g % 10 = 0 THEN 65536 + (g * 7919) % 196608
    ELSE 16 + (g * 7919) % 8192
  END),
  CASE WHEN random() < 0.3 THEN jsonb_build_object('compressed', false, 'origin', 'device-' || seed.rand_int(1, 50)) END
FROM generate_series(1, 300) g;

-- Edge cases: empty file, external file, and a JSON file whose bytes are UTF-8 text
INSERT INTO file_attachments (account_id, file_name, mime_type, charset, content_encoding, content, storage_url, metadata) VALUES
  (1, 'empty.txt', 'text/plain', 'utf-8', 'identity', ''::bytea, NULL, '{"note": "zero bytes, not NULL"}'),
  (1, 'large-video.mp4', 'video/mp4', NULL, 'identity', NULL, 's3://example-uploads/videos/2024/01/large-video.mp4', '{"note": "content stored in object storage"}'),
  (2, 'config.json', 'application/json', 'utf-8', 'identity', convert_to('{"feature": "beta", "name": "Ünïcödé ✓"}', 'UTF8'), NULL, NULL);

UPDATE file_attachments SET
  byte_size = octet_length(content),
  sha256 = digest(content, 'sha256'),
  md5_hex = md5(content),
  thumbnail = CASE WHEN mime_type = 'image/png' THEN content END
WHERE content IS NOT NULL;

UPDATE file_attachments SET storage_url = 's3://example-uploads/' || account_id || '/' || md5_hex || '/' || file_name
WHERE storage_url IS NULL AND id % 3 = 0;

CREATE INDEX file_attachments_ticket_id_idx ON file_attachments (ticket_id);
CREATE INDEX file_attachments_sha256_idx ON file_attachments (sha256);

-- ---------------------------------------------------------------------------
-- inbound_emails: message bodies kept in the charset they arrived in
-- ---------------------------------------------------------------------------

CREATE TABLE inbound_emails (
  id bigserial PRIMARY KEY,
  ticket_id bigint REFERENCES support_tickets (id),
  message_id text NOT NULL,
  from_address text,
  subject text,
  subject_encoded text,
  charset text,
  transfer_encoding text,
  body_text text,
  body_raw bytea,
  body_transfer_encoded text,
  headers hstore,
  spam_score numeric(4, 2),
  received_at timestamptz NOT NULL
);
COMMENT ON TABLE inbound_emails IS 'body_raw holds the bytes in the declared charset (Shift_JIS, KOI8-R, UTF-16...). Some rows declare utf-8 but contain windows-1252 or iso-8859-1 bytes.';
COMMENT ON COLUMN inbound_emails.subject_encoded IS 'RFC 2047 encoded-word, as it appears in the raw header';
COMMENT ON COLUMN inbound_emails.body_transfer_encoded IS 'body_raw as base64 text, wrapped at 76 characters like MIME';

INSERT INTO inbound_emails (ticket_id, message_id, from_address, subject, subject_encoded, charset, transfer_encoding, body_text, body_raw, body_transfer_encoded, headers, spam_score, received_at)
SELECT
  1 + (b.g * 7) % 5000,
  '<' || md5('msg' || b.g) || '@' || seed.pick(ARRAY['mail.gmail.com', 'outlook.com', 'mx.example.jp', 'mail.ru']) || '>',
  seed.pick(seed.first_names()) || ' <sender' || b.g || '@example.com>',
  b.subject,
  '=?' || b.declared_charset || '?B?' || replace(encode(seed.encode_text(b.subject, cs.pg_encoding), 'base64'), E'\n', '') || '?=',
  b.declared_charset,
  'base64',
  b.body,
  b.raw,
  encode(b.raw, 'base64'),
  hstore(ARRAY['MIME-Version', 'Content-Type', 'X-Mailer'], ARRAY['1.0', 'text/plain; charset="' || b.declared_charset || '"', seed.pick(ARRAY['Microsoft Outlook 16.0', 'Apple Mail (2.3654)', 'Becky! ver. 2.81', NULL])]),
  round((random() * 10)::numeric, 2),
  seed.rand_ts(now() - interval '1 year', now())
FROM (
  SELECT
    g,
    cs_id,
    CASE WHEN mislabeled THEN 'utf-8' ELSE x.mime_charset END AS declared_charset,
    left(x.sample, 30) AS subject,
    x.body,
    seed.encode_text(x.body, x.pg_encoding) AS raw
  FROM (
    SELECT
      g,
      cs.id AS cs_id,
      g % 5 = 0 AND cs.pg_encoding IN ('WIN1252', 'LATIN1') AS mislabeled,
      cs.mime_charset,
      cs.pg_encoding,
      cs.sample,
      cs.sample || E'\n\n' || seed.pick((seed.paragraphs())[1:10]) || E'\n\n-- \nSent from my phone' AS body
    FROM generate_series(1, 1600) g
    JOIN seed.charset_samples cs ON cs.id = 1 + g % 16
  ) x
) b
JOIN seed.charset_samples cs ON cs.id = b.cs_id
ORDER BY b.g;

-- ---------------------------------------------------------------------------
-- integrations: secrets and keys in the many shapes they get stored in
-- ---------------------------------------------------------------------------

CREATE TABLE integrations (
  id bigserial PRIMARY KEY,
  account_id bigint NOT NULL REFERENCES accounts (id),
  provider text NOT NULL,
  name text,
  encrypted_config bytea,
  config_iv bytea,
  oauth_access_token_b64 text,
  webhook_secret_hex text,
  public_key_pem text,
  public_key_der bytea,
  fingerprint_sha256 sha256_digest,
  api_key_hash bytea,
  external_uuid_bin bytea,
  scopes text[],
  settings jsonb,
  last_used_ip inet,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN integrations.encrypted_config IS 'pgp_sym_encrypt(config_json, ''dev-only-key'')';
COMMENT ON COLUMN integrations.external_uuid_bin IS 'A UUID stored as 16 raw bytes, as migrated from MySQL BINARY(16)';

INSERT INTO integrations (account_id, provider, name, encrypted_config, config_iv, oauth_access_token_b64, webhook_secret_hex, public_key_der, api_key_hash, external_uuid_bin, scopes, settings, last_used_ip, last_used_at, expires_at)
SELECT
  1 + (g % 500),
  b.provider,
  initcap(b.provider) || ' (' || seed.pick(ARRAY['production', 'staging', 'Marketing team', 'legacy - do not delete']) || ')',
  pgp_sym_encrypt(json_build_object('client_id', md5('c' || g), 'client_secret', md5('s' || g), 'region', seed.pick(ARRAY['us-east-1', 'eu-west-1']))::text, 'dev-only-key', 'cipher-algo=aes256, s2k-mode=1'),
  gen_random_bytes(16),
  encode(gen_random_bytes(48), 'base64'),
  encode(gen_random_bytes(32), 'hex'),
  -- DER-encoded RSA public key: ASN.1 SEQUENCE header followed by key material
  '\x30820122300d06092a864886f70d01010105000382010f003082010a0282010100'::bytea || gen_random_bytes(256) || '\x0203010001'::bytea,
  digest('sk_live_' || md5('key' || g), 'sha256'),
  decode(replace(uuid_generate_v4()::text, '-', ''), 'hex'),
  ARRAY['read', seed.pick(ARRAY['write', 'admin', 'webhooks'])],
  jsonb_build_object('sync_interval_minutes', seed.pick(ARRAY[5, 15, 60]), 'enabled', random() < 0.9),
  ('192.0.2.' || seed.rand_int(1, 254))::inet,
  seed.rand_ts(now() - interval '60 days', now()),
  CASE WHEN random() < 0.5 THEN now() + random() * interval '365 days' END
FROM (
  SELECT g, seed.pick(ARRAY['salesforce', 'hubspot', 'slack', 'github', 'stripe', 'zendesk', 'snowflake', 'google_drive']) AS provider
  FROM generate_series(1, 1000) g
) b;

UPDATE integrations SET
  public_key_pem = E'-----BEGIN PUBLIC KEY-----\n' || encode(public_key_der, 'base64') || E'\n-----END PUBLIC KEY-----\n',
  fingerprint_sha256 = digest(public_key_der, 'sha256');
