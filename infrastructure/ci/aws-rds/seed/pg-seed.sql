-- Postgres-side setup for IAM auth. Runs once, as the master user.
CREATE USER bks_iam_user;
GRANT rds_iam TO bks_iam_user;
GRANT ALL ON DATABASE banana TO bks_iam_user;
GRANT ALL ON SCHEMA public TO bks_iam_user;
