CREATE TABLE users(
   id INT PRIMARY KEY     NOT NULL,
   username       TEXT    NOT NULL,
   email          TEXT    NOT NULL,
   password       TEXT    NOT NULL
);

CREATE TABLE roles(
   id INT PRIMARY KEY     NOT NULL,
   name           TEXT    NOT NULL
);
