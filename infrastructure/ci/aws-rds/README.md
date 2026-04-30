# AWS RDS CI Infrastructure

Terraform module that stands up short-lived RDS Postgres + MySQL instances
against which the RDS IAM integration suite (`apps/studio/tests/integration/rds/`)
runs. The `rds-integration.yml` workflow drives this module; a human only
touches it for one-time bootstrap or local debugging.

## What it creates per run

- `aws_db_instance.pg` — Postgres 16, `db.t4g.micro`, 20 GB gp3, publicly
  accessible, IAM auth enabled, `skip_final_snapshot = true`.
- `aws_db_instance.mysql` — MySQL 8.0, same shape.
- `aws_security_group.db` — ingress restricted to `var.runner_ip/32` on
  ports 5432 and 3306.
- `aws_iam_policy.rds_connect` — `rds-db:connect` scoped to the two
  instance-specific `dbuser` ARNs, attached to the `bks-ci-tests` IAM user.

All resources carry `bks-ci-integration=true` and `bks-run-id=<run_id>`
tags. The janitor (`.github/workflows/rds-janitor.yml`) and
`bin/rds/cleanup-orphans.sh` rely on the first tag.

## One-time bootstrap (out-of-band)

These resources live outside Terraform state because they predate any
single run and are shared across all runs.

1. **Pick a region.** The workflow uses `us-east-2`. If you change it,
   update `env.AWS_REGION` in both `.github/workflows/rds-integration.yml`
   and `.github/workflows/rds-janitor.yml`, plus the `region` default in
   `variables.tf` and the S3 backend's `region` in `backend.tf`.

2. **Create the Terraform state backend.**
   - S3 bucket: `bks-ci-tfstate` with versioning enabled and public access
     fully blocked.
   - DynamoDB table: `bks-ci-tflock`, partition key `LockID` (string), on-demand
     billing.

3. **Create the VPC for the CI databases.**
   - VPC tagged `bks-ci=true`.
   - Two public subnets in different AZs with `map_public_ip_on_launch = true`.
   - Internet gateway + route to `0.0.0.0/0` on both subnets.
   - `aws_db_subnet_group` named `bks-ci` covering the two subnets,
     tagged `bks-ci=true`.

4. **Create the test IAM user.** IAM user `bks-ci-tests`, no inline
   policies (Terraform attaches `rds-db:connect` at apply time). Generate
   one access key.

5. **Wire up GitHub OIDC.** In AWS IAM, create (or reuse) the
   `token.actions.githubusercontent.com` OIDC provider. Create role
   `bks-ci-oidc-provisioner` with a trust policy restricted to
   `repo:beekeeper-studio/beekeeper-studio:ref:refs/heads/master` and
   the matching `workflow_dispatch` variant. The role needs permissions
   to: manage RDS instances and subnet groups; create/destroy VPC
   security groups; create/attach/detach IAM policies; read the
   `bks-ci-tests` user; read/write S3 and DynamoDB for state.

6. **Set GitHub Actions secrets** on
   `beekeeper-studio/beekeeper-studio`:
   - `AWS_ROLE_TO_ASSUME` — ARN of `bks-ci-oidc-provisioner`.
   - `BKS_TEST_ACCESS_KEY_ID` / `BKS_TEST_SECRET_ACCESS_KEY` — the
     `bks-ci-tests` access key. These are read by the IAM signer (Key
     method), written into a tmp credentials file in-process (File
     method), and exported as `AWS_ACCESS_KEY_ID` /
     `AWS_SECRET_ACCESS_KEY` for `/usr/bin/aws` (CLI method).

7. **(Recommended)** Add a CloudWatch billing alarm at $5/day on the RDS
   service in the CI account as a cost guardrail.

## Local dry run

```bash
cd infrastructure/ci/aws-rds

terraform init \
  -backend-config=key=local-$(whoami).tfstate

terraform apply \
  -var="run_id=local-$(date +%s)" \
  -var="runner_ip=$(curl -s https://api.ipify.org)" \
  -var="region=us-east-2"

# Pull outputs into the environment the seed + tests expect.
eval "$(terraform output -json | jq -r '
  "export BKS_RDS_PG_HOST=\(.pg_host.value)",
  "export BKS_RDS_PG_PORT=\(.pg_port.value)",
  "export BKS_RDS_PG_MASTER_USER=\(.pg_master_user.value)",
  "export BKS_RDS_PG_MASTER_PASSWORD=\(.pg_master_password.value)",
  "export BKS_RDS_PG_IAM_USER=\(.pg_iam_user.value)",
  "export BKS_RDS_MYSQL_HOST=\(.mysql_host.value)",
  "export BKS_RDS_MYSQL_PORT=\(.mysql_port.value)",
  "export BKS_RDS_MYSQL_MASTER_USER=\(.mysql_master_user.value)",
  "export BKS_RDS_MYSQL_MASTER_PASSWORD=\(.mysql_master_password.value)",
  "export BKS_RDS_MYSQL_IAM_USER=\(.mysql_iam_user.value)"
' | paste -sd' ' -)"

../../../bin/rds/seed-rds.sh

export BKS_RDS_AWS_REGION=us-east-2
export BKS_TEST_ACCESS_KEY_ID=...
export BKS_TEST_SECRET_ACCESS_KEY=...
export AWS_ACCESS_KEY_ID="$BKS_TEST_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$BKS_TEST_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION=us-east-2

cd ../../..
yarn test:rds

cd infrastructure/ci/aws-rds
terraform destroy -auto-approve \
  -var="run_id=local-..." \
  -var="runner_ip=$(curl -s https://api.ipify.org)" \
  -var="region=us-east-2"
```

Double-check nothing was left behind:

```bash
aws rds describe-db-instances \
  --query "DBInstances[?contains(TagList[?Key=='bks-ci-integration'].Value, 'true')].DBInstanceIdentifier"
```

## Adding another cloud (Azure SQL, Cloud SQL, ...)

Clone `infrastructure/ci/aws-rds/` to the sibling directory, swap the
provider + resources, and add a new workflow modeled on
`rds-integration.yml`. The test layer (`RdsTestDriver`, `runCommonTests`)
is engine-agnostic and can be reused by passing different env vars.
