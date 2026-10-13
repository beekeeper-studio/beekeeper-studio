-- Loaded into the legacy_sql_ascii database (ENCODING 'SQL_ASCII'). The server stores bytes
-- without validating them, so over the years this table collected UTF-8, Latin-1,
-- Windows-1252 and Shift_JIS text side by side. Clients see invalid UTF-8.

SET client_min_messages = warning;

CREATE TABLE contacts (
  id serial PRIMARY KEY,
  name text,
  city text,
  actual_encoding text,
  source text,
  name_bytes bytea,
  created_at timestamp DEFAULT now()
);
COMMENT ON TABLE contacts IS 'Text columns hold bytes in mixed encodings. actual_encoding says which; name_bytes shows the raw bytes.';

INSERT INTO contacts (name, city, actual_encoding, source) VALUES
  (E'Caf\xc3\xa9 Owner', E'M\xc3\xbcnchen', 'UTF-8', 'web form'),
  (E'Caf\xe9 Owner', E'M\xfcnchen', 'ISO-8859-1', 'CSV import, 2009'),
  (E'\x93Smart Quotes\x94 Ltd \x96 Est. 1999', E'Z\xfcrich', 'Windows-1252', 'pasted from Word'),
  (E'\xe6\x97\xa5\xe6\x9c\xac\xe8\xaa\x9e', E'\xe6\x9d\xb1\xe4\xba\xac', 'UTF-8', 'API'),
  (E'\x83e\x83X\x83g\x89\xef\x8e\xd0', E'\x93\x8c\x8b\x9e', 'Shift_JIS', 'legacy desktop app'),
  (E'Ren\xc3\x83\xc2\xa9e (double encoded)', 'Paris', 'UTF-8 encoded twice', 'sync job bug'),
  (E'Truncated \xe2\x82', 'Berlin', 'invalid UTF-8 (cut mid-character)', 'varchar(20) truncation'),
  ('Plain ASCII', 'Boston', 'ASCII', 'web form');

INSERT INTO contacts (name, city, actual_encoding, source)
SELECT
  (ARRAY[E'J\xc3\xbcrgen', E'J\xfcrgen', E'Fran\xc3\xa7ois', E'Fran\xe7ois', E'Jos\xe9', 'John'])[1 + g % 6] || ' ' || g,
  (ARRAY[E'K\xc3\xb6ln', E'K\xf6ln', E'S\xc3\xa3o Paulo', E'S\xe3o Paulo', 'Austin'])[1 + g % 5],
  'mixed',
  'bulk import ' || (g % 7)
FROM generate_series(1, 200) g;

UPDATE contacts SET name_bytes = textsend(name);
