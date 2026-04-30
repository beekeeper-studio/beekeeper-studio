locals {
  common_tags = {
    "bks-ci-integration" = "true"
    "bks-run-id"         = var.run_id
  }
}

data "aws_caller_identity" "current" {}

resource "random_password" "pg_master" {
  length  = 32
  special = false
}

resource "random_password" "mysql_master" {
  length  = 32
  special = false
}

resource "aws_db_instance" "pg" {
  identifier     = "bks-ci-pg-${var.run_id}"
  engine         = "postgres"
  engine_version = "16.4"
  instance_class = "db.t4g.micro"

  allocated_storage     = 20
  max_allocated_storage = 0
  storage_type          = "gp3"
  storage_encrypted     = true

  username = "bks_master"
  password = random_password.pg_master.result
  db_name  = "banana"
  port     = 5432

  iam_database_authentication_enabled = true

  vpc_security_group_ids = [aws_security_group.db.id]
  db_subnet_group_name   = data.aws_db_subnet_group.ci.name
  publicly_accessible    = true

  backup_retention_period = 0
  skip_final_snapshot     = true
  deletion_protection     = false
  apply_immediately       = true

  copy_tags_to_snapshot = false
  monitoring_interval   = 0
  performance_insights_enabled = false
}

resource "aws_db_instance" "mysql" {
  identifier     = "bks-ci-mysql-${var.run_id}"
  engine         = "mysql"
  engine_version = "8.0"
  instance_class = "db.t4g.micro"

  allocated_storage     = 20
  max_allocated_storage = 0
  storage_type          = "gp3"
  storage_encrypted     = true

  username = "bks_master"
  password = random_password.mysql_master.result
  db_name  = "banana"
  port     = 3306

  iam_database_authentication_enabled = true

  vpc_security_group_ids = [aws_security_group.db.id]
  db_subnet_group_name   = data.aws_db_subnet_group.ci.name
  publicly_accessible    = true

  backup_retention_period = 0
  skip_final_snapshot     = true
  deletion_protection     = false
  apply_immediately       = true

  copy_tags_to_snapshot = false
  monitoring_interval   = 0
  performance_insights_enabled = false
}
