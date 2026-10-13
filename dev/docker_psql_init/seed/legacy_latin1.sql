-- Loaded into the legacy_latin1 database (ENCODING 'LATIN1'), the kind of database found
-- on long-lived European installs. It also uses the pre-9.0 bytea_output = escape.

SET client_min_messages = warning;
-- This file is UTF-8. Without this psql would send it as the database encoding (LATIN1).
SET client_encoding = 'UTF8';

DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET bytea_output = %L', current_database(), 'escape');
END
$$;

CREATE TABLE kunden (
  kundennummer serial PRIMARY KEY,
  firma text NOT NULL,
  ansprechpartner text,
  strasse text,
  plz char(5),
  ort text,
  land text DEFAULT 'Deutschland',
  bemerkung text,
  umsatz numeric(12, 2),
  logo bytea,
  angelegt_am timestamp DEFAULT now()
);
COMMENT ON TABLE kunden IS 'Kundenstamm (Latin-1)';

INSERT INTO kunden (firma, ansprechpartner, strasse, plz, ort, land, bemerkung, umsatz, logo)
SELECT
  (ARRAY['Müller & Söhne GmbH', 'Bäckerei Weiß', 'Größenwahn AG', 'Café Möller', 'Schröder Elektronik', 'Société Générale de Fruits', 'Ångström Optik', 'Señor Muñoz S.L.'])[1 + g % 8],
  (ARRAY['Jürgen Weiß', 'Zoë Schäfer', 'Björn Ødegård', 'François Dupré', 'Íñigo Peña', 'Søren Kühl'])[1 + g % 6],
  (ARRAY['Königstraße', 'Hauptstraße', 'Brückenweg', 'Am Mühlbach', 'Rue de l''Église'])[1 + g % 5] || ' ' || (1 + g % 120),
  lpad((10000 + g * 37 % 89999)::text, 5, '0'),
  (ARRAY['München', 'Köln', 'Düsseldorf', 'Nürnberg', 'Zürich', 'Genève', 'Malmö'])[1 + g % 7],
  (ARRAY['Deutschland', 'Österreich', 'Schweiz', 'Frankreich', 'Schweden'])[1 + g % 5],
  CASE g % 4
    WHEN 0 THEN 'Zahlung per Überweisung, 2 % Skonto bei Zahlung binnen 14 Tagen.'
    WHEN 1 THEN 'Lieferung nur werktags. Ansprechpartner ist ab März in Elternzeit.'
    WHEN 2 THEN '«Stammkunde» seit 1998 - bitte bevorzugt behandeln.'
    ELSE NULL
  END,
  round((g * 1234.5678 % 100000)::numeric, 2),
  CASE WHEN g % 5 = 0 THEN decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64') END
FROM generate_series(1, 300) g;
