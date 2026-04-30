# Networking is bootstrapped out-of-band (see README) and looked up by tag
# here so Terraform doesn't have to own long-lived VPC state.
data "aws_vpc" "ci" {
  filter {
    name   = "tag:bks-ci"
    values = ["true"]
  }
}

data "aws_db_subnet_group" "ci" {
  name = "bks-ci"
}

# Per-run SG. Ingress is locked to the runner's public IP on the two DB
# ports; everything else is dropped. Terraform destroys it alongside the
# RDS instances, so nothing lingers between runs.
resource "aws_security_group" "db" {
  name        = "bks-ci-rds-${var.run_id}"
  description = "RDS ingress for CI run ${var.run_id}"
  vpc_id      = data.aws_vpc.ci.id

  ingress {
    description = "Postgres from runner"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["${var.runner_ip}/32"]
  }

  ingress {
    description = "MySQL from runner"
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = ["${var.runner_ip}/32"]
  }

  egress {
    description = "All egress"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
