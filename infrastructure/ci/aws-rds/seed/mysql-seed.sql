-- MySQL-side setup for IAM auth. Runs once, as the master user.
CREATE USER 'bks_iam_user'@'%' IDENTIFIED WITH AWSAuthenticationPlugin AS 'RDS' REQUIRE SSL;
GRANT ALL PRIVILEGES ON banana.* TO 'bks_iam_user'@'%';
FLUSH PRIVILEGES;
