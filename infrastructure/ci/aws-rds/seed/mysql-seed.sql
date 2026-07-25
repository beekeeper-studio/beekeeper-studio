-- MySQL-side setup for IAM auth. Runs once as master.
CREATE USER 'bks_iam_user'@'%' IDENTIFIED WITH AWSAuthenticationPlugin AS 'RDS' REQUIRE SSL;

CREATE DATABASE banana_key;
CREATE DATABASE banana_file;
CREATE DATABASE banana_cli;

GRANT ALL PRIVILEGES ON `banana_%`.* TO 'bks_iam_user'@'%';
FLUSH PRIVILEGES;
