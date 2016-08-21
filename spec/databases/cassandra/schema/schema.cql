CREATE KEYSPACE IF NOT EXISTS sqlectron
WITH REPLICATION = { 'class': 'SimpleStrategy', 'replication_factor': 3 };

CREATE TABLE IF NOT EXISTS sqlectron.roles(
   id             INT,
   name           TEXT,
   PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS sqlectron.users(
   id             INT,
   username       TEXT,
   email          TEXT,
   password       TEXT,
   role_id        INT,
   createdat      TIMESTAMP,
   PRIMARY KEY (id)
);
