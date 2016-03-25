CREATE TABLE users(
   id             SERIAL PRIMARY KEY,
   username       TEXT    NOT NULL,
   email          TEXT    NOT NULL,
   password       TEXT    NOT NULL
);

CREATE TABLE roles(
   id             SERIAL PRIMARY KEY,
   name           TEXT    NOT NULL
);

CREATE OR REPLACE VIEW email_view AS
  SELECT users.email, users.password
  FROM users;

CREATE OR REPLACE FUNCTION user_count()
RETURNS bigint AS $$
  SELECT COUNT(*) FROM users AS total;
$$ LANGUAGE SQL;
