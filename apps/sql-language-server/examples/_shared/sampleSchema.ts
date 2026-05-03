/**
 * Sample schema used by tests and demos. Three tables with realistic
 * relationships so completion has something interesting to surface
 * (FROM tables, columns per table, JOIN relationships).
 */
export const SAMPLE_SCHEMA_SQL = `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    created_at TEXT
  );

  CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    total NUMERIC NOT NULL,
    status TEXT,
    created_at TEXT
  );

  CREATE TABLE order_items (
    id INTEGER PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price NUMERIC NOT NULL
  );

  INSERT INTO users (name, email) VALUES
    ('Alice', 'alice@example.com'),
    ('Bob',   'bob@example.com');
  INSERT INTO orders (user_id, total, status) VALUES
    (1, 99.99, 'shipped'),
    (2, 42.50, 'pending');
  INSERT INTO order_items (order_id, product_name, quantity, price) VALUES
    (1, 'Widget', 2, 49.99),
    (2, 'Gadget', 1, 42.50);
`;
