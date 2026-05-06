-- Postgres-side setup for IAM auth. Runs once as master.
CREATE USER bks_iam_user;
GRANT rds_iam TO bks_iam_user;

CREATE DATABASE banana_key;
CREATE DATABASE banana_file;
CREATE DATABASE banana_cli;

GRANT ALL ON DATABASE banana_key  TO bks_iam_user;
GRANT ALL ON DATABASE banana_file TO bks_iam_user;
GRANT ALL ON DATABASE banana_cli  TO bks_iam_user;

\connect banana_key
GRANT ALL ON SCHEMA public TO bks_iam_user;
\connect banana_file
GRANT ALL ON SCHEMA public TO bks_iam_user;
\connect banana_cli
GRANT ALL ON SCHEMA public TO bks_iam_user;
