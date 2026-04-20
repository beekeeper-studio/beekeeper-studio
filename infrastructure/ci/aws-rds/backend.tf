# Backend block. `key` is passed in via `-backend-config=key=...` from
# the workflow so every run gets its own state file under aws-rds/<run_id>.
terraform {
  backend "s3" {
    bucket         = "bks-ci-tfstate"
    region         = "us-east-2"
    dynamodb_table = "bks-ci-tflock"
    encrypt        = true
  }
}
