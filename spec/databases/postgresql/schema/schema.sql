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
