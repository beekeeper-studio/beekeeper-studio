variable "run_id" {
  type        = string
  description = "Unique identifier for this CI run. Feeds into every resource name so parallel runs don't collide."
}

variable "runner_ip" {
  type        = string
  description = "IPv4 address of the GitHub Actions runner. Narrows the RDS security group's ingress to this single host."
}

variable "region" {
  type        = string
  default     = "us-east-2"
  description = "AWS region to provision the RDS instances in."
}

variable "iam_test_user" {
  type        = string
  default     = "bks-ci-tests"
  description = "IAM user that the Key / File / CLI auth methods sign with. Must already exist (see README bootstrap)."
}

variable "db_iam_user" {
  type        = string
  default     = "bks_iam_user"
  description = "Database-level user created by the seed SQL. rds-db:connect is granted on this name."
}
