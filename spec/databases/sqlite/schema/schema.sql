CREATE TABLE IF NOT EXISTS roles (
  id INTEGER NOT NULL,
  name VARCHAR(100) NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER NOT NULL,
  username VARCHAR(45) NULL,
  email VARCHAR(150) NULL,
  password VARCHAR(45) NULL,
  role_id INT,
  createdat DATETIME NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (role_id) REFERENCES roles (id)
);

-- create pk index manually because for some reason
-- it is not listed as a index
CREATE INDEX IF NOT EXISTS users_id_index ON users (id);

CREATE VIEW IF NOT EXISTS email_view AS
  SELECT users.email, users.password
  FROM users;

DROP TRIGGER IF EXISTS dummy_trigger;
CREATE TRIGGER dummy_trigger AFTER INSERT ON users
BEGIN
  DELETE FROM users where id = -1;
END;
