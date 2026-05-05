# AWS RDS CI Infrastructure

Two shell scripts that stand up short-lived RDS Postgres + MySQL
instances for the IAM integration suite
(`apps/studio/tests/integration/rds/`) and tear them down after. Driven by
the `rds-integration.yml` workflow; a human only touches them for
one-time bootstrap or local debugging.

## Layout

```
provision.sh         Create per-run resources, seed databases, emit
                     endpoints to $GITHUB_OUTPUT.
destroy.sh           Symmetric teardown by RUN_ID. Idempotent.
seed/pg-seed.sql     Creates `bks_iam_user` with `rds_iam` role.
seed/mysql-seed.sql  Creates `bks_iam_user` with AWSAuthenticationPlugin.
```

All resources tagged `bks-ci-integration=true` and `bks-run-id=<RUN_ID>`.
Resource names derive from `RUN_ID` so destroy needs no shared state.
The janitor (`.github/workflows/rds-janitor.yml`) and
`bin/rds/cleanup-orphans.sh` rely on the first tag.

## What `provision.sh` creates per run

- `bks-ci-pg-<RUN_ID>` — Postgres 16, `db.t4g.micro`, 20 GB gp3,
  IAM auth on, publicly accessible, `--skip-final-snapshot` at delete time.
- `bks-ci-mysql-<RUN_ID>` — same shape, MySQL 8.0.
- `bks-ci-rds-<RUN_ID>` — security group in the default VPC, ingress
  restricted to the runner's public IP on 5432 + 3306.

`rds-db:connect` is granted permanently on the `bks-ci-tests` IAM user
via the policy below — scoped to any DB user named `bks_iam_user`, which
is acceptable in a CI-only AWS account.

## One-time bootstrap (out-of-band)

Three steps. No OIDC, no Terraform state backend, no custom VPC.

1. **IAM user `bks-ci-tests` with the policy below.** Attach as inline or
   managed; either works. Generate one access key and save the credentials
   as repo secrets:
   - `BKS_TEST_ACCESS_KEY_ID`
   - `BKS_TEST_SECRET_ACCESS_KEY`

   These keys do double duty: the workflow uses them to provision/destroy
   instances (via the policy below), and the test suite uses them to
   exercise the Key / File / CLI auth code paths.

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "RDSManagePrefixed",
         "Effect": "Allow",
         "Action": [
           "rds:CreateDBInstance",
           "rds:DeleteDBInstance",
           "rds:DescribeDBInstances",
           "rds:AddTagsToResource",
           "rds:ListTagsForResource"
         ],
         "Resource": [
           "arn:aws:rds:us-east-2:*:db:bks-ci-*",
           "arn:aws:rds:us-east-2:*:subgrp:*",
           "arn:aws:rds:us-east-2:*:pg:*",
           "arn:aws:rds:us-east-2:*:og:*"
         ]
       },
       {
         "Sid": "RDSReadSubnetGroups",
         "Effect": "Allow",
         "Action": "rds:DescribeDBSubnetGroups",
         "Resource": "*"
       },
       {
         "Sid": "EC2ReadAndCreate",
         "Effect": "Allow",
         "Action": [
           "ec2:DescribeVpcs",
           "ec2:DescribeSecurityGroups",
           "ec2:CreateSecurityGroup",
           "ec2:CreateTags"
         ],
         "Resource": "*",
         "Condition": {
           "StringEquals": { "aws:RequestedRegion": "us-east-2" }
         }
       },
       {
         "Sid": "EC2ModifyOurSGs",
         "Effect": "Allow",
         "Action": [
           "ec2:DeleteSecurityGroup",
           "ec2:AuthorizeSecurityGroupIngress",
           "ec2:RevokeSecurityGroupIngress"
         ],
         "Resource": "*",
         "Condition": {
           "StringEquals": {
             "aws:RequestedRegion": "us-east-2",
             "ec2:ResourceTag/bks-ci-integration": "true"
           }
         }
       },
       {
         "Sid": "RDSConnect",
         "Effect": "Allow",
         "Action": "rds-db:connect",
         "Resource": "arn:aws:rds-db:*:*:dbuser:*/bks_iam_user"
       }
     ]
   }
   ```

2. **Default DB subnet group.** RDS needs a subnet group covering at
   least two AZs. Most accounts already have one called `default`; verify
   with:
   ```bash
   aws rds describe-db-subnet-groups --db-subnet-group-name default
   ```
   If that 404s, create it once against the default VPC's public subnets:
   ```bash
   aws rds create-db-subnet-group \
     --db-subnet-group-name default \
     --db-subnet-group-description default \
     --subnet-ids subnet-xxx subnet-yyy
   ```

3. **(Recommended)** Add a CloudWatch billing alarm at $5/day on RDS in
   this account as a cost guardrail.

## Local dry run

```bash
export RUN_ID="local-$(date +%s)"
export AWS_REGION=us-east-2
export AWS_ACCESS_KEY_ID=...        # bks-ci-tests
export AWS_SECRET_ACCESS_KEY=...

./infrastructure/ci/aws-rds/provision.sh
# Script prints pg_host=..., mysql_host=... at the end.

# Wire those into the test driver:
export BKS_RDS_AWS_REGION=$AWS_REGION
export BKS_RDS_PG_HOST=...        BKS_RDS_PG_PORT=5432    BKS_RDS_PG_IAM_USER=bks_iam_user
export BKS_RDS_MYSQL_HOST=...     BKS_RDS_MYSQL_PORT=3306 BKS_RDS_MYSQL_IAM_USER=bks_iam_user
export BKS_TEST_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
export BKS_TEST_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"

yarn test:rds

./infrastructure/ci/aws-rds/destroy.sh

# Confirm nothing's left:
aws rds describe-db-instances \
  --query "DBInstances[?contains(TagList[?Key=='bks-run-id'].Value, '$RUN_ID')].DBInstanceIdentifier"
```

## Adding another cloud (Snowflake, BigQuery, Cloud SQL, Azure SQL)

Clone this directory to a sibling — e.g. `infrastructure/ci/gcp-cloudsql/`
— and replace `provision.sh` / `destroy.sh` with the equivalent
`gcloud` commands. Then add a workflow modeled on
`rds-integration.yml` that calls them. The test layer
(`RdsTestDriver`, `runCommonTests`) doesn't care which cloud the
endpoints point at — it just reads `BKS_RDS_*` env vars.
