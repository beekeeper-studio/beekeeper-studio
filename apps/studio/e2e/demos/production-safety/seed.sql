-- "Production" database for a small coffee-subscription business (fictional).
DROP TABLE IF EXISTS orders, products, customers CASCADE;

CREATE TABLE customers (
  id          serial PRIMARY KEY,
  first_name  varchar(60) NOT NULL,
  last_name   varchar(60) NOT NULL,
  email       varchar(120) NOT NULL UNIQUE,
  plan        varchar(20) NOT NULL,
  status      varchar(20) NOT NULL DEFAULT 'active',
  city        varchar(60),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id     serial PRIMARY KEY,
  name   varchar(80) NOT NULL,
  price  numeric(8,2) NOT NULL
);

CREATE TABLE orders (
  id           serial PRIMARY KEY,
  customer_id  int NOT NULL REFERENCES customers(id),
  product_id   int NOT NULL REFERENCES products(id),
  quantity     int NOT NULL,
  total        numeric(10,2) NOT NULL,
  status       varchar(20) NOT NULL,
  ordered_at   timestamptz NOT NULL
);

INSERT INTO products (name, price) VALUES
  ('House Blend 1kg', 24.00), ('Ethiopia Yirgacheffe 250g', 14.50),
  ('Colombia Supremo 500g', 17.00), ('Decaf Swiss Water 250g', 13.00),
  ('Espresso Roast 1kg', 26.00), ('Cold Brew Pack', 19.00);

SELECT setseed(0.42);

CREATE TEMP TABLE gen AS
SELECT n,
  (ARRAY['Olivia','Liam','Emma','Noah','Ava','Mason','Sophia','Lucas','Mia','Ethan',
         'Isabella','James','Amelia','Benjamin','Harper','Elijah','Evelyn','Henry','Abigail','Daniel',
         'Grace','Jack','Chloe','Leo','Zoe','Owen','Lily','Ryan','Nora','Caleb',
         'Hannah','Isaac','Aria','Wyatt','Layla','Julian','Stella','Gabriel','Maya','Adrian'])[1 + floor(random() * 40)::int] AS f,
  (ARRAY['Smith','Garcia','Patel','Nguyen','Brown','Wilson','Martinez','Anderson','Taylor','Thomas',
         'Moore','Clark','Lewis','Walker','Hall','Young','King','Wright','Lopez','Hill',
         'Baker','Reed','Cook','Ward','Price','Bell','Ross','Hayes','Kim','Chen',
         'Rivera','Murphy','Foster','Brooks','Sanders','Bennett','Gray','Coleman','Jenkins','Perry','Russell'])[1 + floor(random() * 41)::int] AS l,
  (ARRAY['gmail.com','outlook.com','yahoo.com','icloud.com','proton.me','hey.com'])[1 + floor(random() * 6)::int] AS domain,
  (ARRAY['Starter','Starter','Starter','Pro','Pro','Business'])[1 + floor(random() * 6)::int] AS plan,
  CASE WHEN random() < 0.08 THEN 'paused' WHEN random() < 0.05 THEN 'cancelled' ELSE 'active' END AS status,
  (ARRAY['Austin','Denver','Portland','Chicago','Boston','Seattle','Atlanta','Toronto','Minneapolis','Raleigh'])[1 + floor(random() * 10)::int] AS city
FROM generate_series(1, 1180) AS n;

INSERT INTO customers (first_name, last_name, email, plan, status, city, created_at)
SELECT f, l,
       lower(f) || '.' || lower(l)
         || CASE WHEN row_number() OVER (PARTITION BY f, l, domain ORDER BY n) > 1
                 THEN (row_number() OVER (PARTITION BY f, l, domain ORDER BY n))::text ELSE '' END
         || '@' || domain,
       plan, status, city,
       now() - ((1500 - n) || ' days')::interval + ((n * 7919 % 86400) || ' seconds')::interval
FROM gen ORDER BY n;

-- Two customers with near-identical names, side by side: the classic "wrong row" trap.
INSERT INTO customers (first_name, last_name, email, plan, status, city, created_at) VALUES
  ('Sarah', 'Johnson',  'sarah.johnson@gmail.com',   'Pro',     'active', 'Denver', now() - interval '320 days'),
  ('Sara',  'Johnston', 'sara.johnston@outlook.com', 'Starter', 'active', 'Denver', now() - interval '319 days');

INSERT INTO customers (first_name, last_name, email, plan, status, city, created_at)
SELECT f, l, lower(f) || '.' || lower(l) || '.' || n || '@' || domain, plan, 'active', city,
       now() - ((60 - n) || ' days')::interval
FROM gen WHERE n <= 58 ORDER BY n;

INSERT INTO orders (customer_id, product_id, quantity, total, status, ordered_at)
SELECT c, p, q, round((SELECT price FROM products WHERE id = p) * q, 2),
       (ARRAY['delivered','delivered','delivered','delivered','shipped','processing','refunded'])[1 + floor(random() * 7)::int],
       now() - ((random() * 700)::int || ' days')::interval - ((random() * 86400)::int || ' seconds')::interval
FROM (
  SELECT n, 1 + floor(random() * 1240)::int AS c, 1 + floor(random() * 6)::int AS p, 1 + floor(random() * 3)::int AS q
  FROM generate_series(1, 18437) AS n
) s;

ANALYZE;
