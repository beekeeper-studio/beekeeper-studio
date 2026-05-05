# AWS RDS CI Infrastructure

Two shell scripts that stand up short-lived RDS Postgres + MySQL
instances for the IAM integration suite
(`apps/studio/tests/integration/rds/`) and tear them down after. Driven by
the `rds-integration.yml` workflow; a human only touches them for
one-time bootstrap or local debugging.

## Layout

```
provision.sh      Create per-run resources, seed databases, attach IAM
                  policy to the test user, emit endpoints to $GITHUB_OUTPUT.
destroy.sh        Symmetric teardown by RUN_ID. Idempotent.
seed/pg-seed.sql  Creates `bks_iam_user` with `rds_iam` role.
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
- `bks-ci-rds-connect-<RUN_ID>` — inline IAM policy on `bks-ci-tests`
  granting `rds-db:connect` scoped to the two `DbiResourceId/bks_iam_user`
  ARNs. Inline (not managed) so a single delete-user-policy removes it.

## One-time bootstrap (out-of-band)

Four steps. None of them require Terraform / S3 / DynamoDB.

1. **Test IAM user.** Create IAM user `bks-ci-tests` with one access key.
   Save the credentials as repo secrets:
   - `BKS_TEST_ACCESS_KEY_ID`
   - `BKS_TEST_SECRET_ACCESS_KEY`

   Don't attach any inline policies — `provision.sh` puts and removes the
   per-run `rds-db:connect` grant itself.

2. **OIDC role for the workflow.** If the GitHub OIDC provider
   (`token.actions.githubusercontent.com`) doesn't already exist in this
   account, create it. Then create role `bks-ci-oidc-provisioner` with a
   trust policy restricted to
   `repo:beekeeper-studio/beekeeper-studio:ref:refs/heads/master` plus
   the `workflow_dispatch` variant. Permissions:

   ```
   rds:*                                          (in-region)
   ec2:CreateSecurityGroup                        (in default VPC)
   ec2:DeleteSecurityGroup
   ec2:AuthorizeSecurityGroupIngress
   ec2:RevokeSecurityGroupIngress
   ec2:DescribeSecurityGroups
   ec2:DescribeVpcs
   sts:GetCallerIdentity
   iam:PutUserPolicy / iam:DeleteUserPolicy       (on bks-ci-tests only)
   ```

   Save the role ARN as repo secret `AWS_ROLE_TO_ASSUME`.

3. **Default DB subnet group.** RDS needs a subnet group covering at
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

4. **(Recommended)** Add a CloudWatch billing alarm at $5/day on RDS in
   this account as a cost guardrail.

## Local dry run

```bash
export RUN_ID="local-$(date +%s)"
export AWS_REGION=us-east-2
# AWS credentials must already be in the environment (aws sso, env vars, etc.)

./infrastructure/ci/aws-rds/provision.sh
# Script prints pg_host=..., mysql_host=... at the end.

# Wire those into the test driver:
export BKS_RDS_AWS_REGION=$AWS_REGION
export BKS_RDS_PG_HOST=...        BKS_RDS_PG_PORT=5432    BKS_RDS_PG_IAM_USER=bks_iam_user
export BKS_RDS_MYSQL_HOST=...     BKS_RDS_MYSQL_PORT=3306 BKS_RDS_MYSQL_IAM_USER=bks_iam_user
export BKS_TEST_ACCESS_KEY_ID=...
export BKS_TEST_SECRET_ACCESS_KEY=...
export AWS_ACCESS_KEY_ID="$BKS_TEST_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$BKS_TEST_SECRET_ACCESS_KEY"

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
