#! /bin/bash
# Provisions per-run RDS Postgres + MySQL instances for the IAM
# integration suite. All resource names derive from $RUN_ID so destroy.sh
# needs no shared state. Idempotent only insofar as a re-run with the same
# RUN_ID will fail loudly on the first CreateDBInstance — that's deliberate
# to surface unexpected leftovers rather than silently reuse them.
#
# Required env: RUN_ID, AWS_REGION, IAM_TEST_USER (default bks-ci-tests),
# DB_IAM_USER (default bks_iam_user). AWS credentials must already be
# configured in the environment (the workflow uses OIDC role assumption).

set -euo pipefail

: "${RUN_ID:?RUN_ID must be set}"
: "${AWS_REGION:?AWS_REGION must be set}"

IAM_TEST_USER="${IAM_TEST_USER:-bks-ci-tests}"
DB_IAM_USER="${DB_IAM_USER:-bks_iam_user}"

PG_ID="bks-ci-pg-${RUN_ID}"
MYSQL_ID="bks-ci-mysql-${RUN_ID}"
SG_NAME="bks-ci-rds-${RUN_ID}"
POLICY_NAME="bks-ci-rds-connect-${RUN_ID}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SEED_DIR="$SCRIPT_DIR/seed"

TAGS="Key=bks-ci-integration,Value=true Key=bks-run-id,Value=${RUN_ID}"

emit() {
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    echo "$1=$2" >> "$GITHUB_OUTPUT"
  fi
  echo "::add-mask::$2" || true
  echo "$1=$2"
}

echo "Resolving runner IP..."
RUNNER_IP="$(curl --silent --fail --max-time 10 https://api.ipify.org)"
[[ -z "$RUNNER_IP" ]] && { echo "Failed to determine runner IP" >&2; exit 1; }
echo "::add-mask::$RUNNER_IP"

echo "Looking up default VPC..."
VPC_ID="$(aws ec2 describe-vpcs \
  --filters Name=is-default,Values=true \
  --query 'Vpcs[0].VpcId' --output text)"
[[ "$VPC_ID" == "None" || -z "$VPC_ID" ]] && { echo "No default VPC found" >&2; exit 1; }

echo "Creating security group $SG_NAME in $VPC_ID..."
SG_ID="$(aws ec2 create-security-group \
  --group-name "$SG_NAME" \
  --description "RDS ingress for CI run $RUN_ID" \
  --vpc-id "$VPC_ID" \
  --tag-specifications "ResourceType=security-group,Tags=[{Key=bks-ci-integration,Value=true},{Key=bks-run-id,Value=$RUN_ID}]" \
  --query 'GroupId' --output text)"

aws ec2 authorize-security-group-ingress --group-id "$SG_ID" \
  --ip-permissions \
    "IpProtocol=tcp,FromPort=5432,ToPort=5432,IpRanges=[{CidrIp=$RUNNER_IP/32}]" \
    "IpProtocol=tcp,FromPort=3306,ToPort=3306,IpRanges=[{CidrIp=$RUNNER_IP/32}]" \
  >/dev/null

PG_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
MYSQL_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
echo "::add-mask::$PG_PASSWORD"
echo "::add-mask::$MYSQL_PASSWORD"

create_instance() {
  local id="$1" engine="$2" version="$3" port="$4" pw="$5"
  echo "Creating $engine instance $id..."
  aws rds create-db-instance \
    --db-instance-identifier "$id" \
    --engine "$engine" \
    --engine-version "$version" \
    --db-instance-class db.t4g.micro \
    --allocated-storage 20 \
    --storage-type gp3 \
    --storage-encrypted \
    --master-username bks_master \
    --master-user-password "$pw" \
    --db-name banana \
    --port "$port" \
    --enable-iam-database-authentication \
    --publicly-accessible \
    --backup-retention-period 0 \
    --no-deletion-protection \
    --no-multi-az \
    --vpc-security-group-ids "$SG_ID" \
    --db-subnet-group-name default \
    --tags $TAGS \
    >/dev/null
}

create_instance "$PG_ID"    postgres 16.4 5432 "$PG_PASSWORD"
create_instance "$MYSQL_ID" mysql    8.0  3306 "$MYSQL_PASSWORD"

echo "Waiting for instances to become available (this typically takes 5-8 min)..."
aws rds wait db-instance-available --db-instance-identifier "$PG_ID"
aws rds wait db-instance-available --db-instance-identifier "$MYSQL_ID"

read -r PG_HOST PG_RESOURCE_ID < <(aws rds describe-db-instances \
  --db-instance-identifier "$PG_ID" \
  --query 'DBInstances[0].[Endpoint.Address,DbiResourceId]' \
  --output text)

read -r MYSQL_HOST MYSQL_RESOURCE_ID < <(aws rds describe-db-instances \
  --db-instance-identifier "$MYSQL_ID" \
  --query 'DBInstances[0].[Endpoint.Address,DbiResourceId]' \
  --output text)

echo "::add-mask::$PG_HOST"
echo "::add-mask::$MYSQL_HOST"

echo "Seeding Postgres..."
PGPASSWORD="$PG_PASSWORD" psql \
  --host "$PG_HOST" --port 5432 --username bks_master \
  --dbname banana --set ON_ERROR_STOP=1 \
  -f "$SEED_DIR/pg-seed.sql"

echo "Seeding MySQL..."
mysql --host "$MYSQL_HOST" --port 3306 --user bks_master \
  --password="$MYSQL_PASSWORD" --ssl-mode=REQUIRED \
  banana < "$SEED_DIR/mysql-seed.sql"

echo "Attaching rds-db:connect policy to $IAM_TEST_USER..."
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"

POLICY_DOC="$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "rds-db:connect",
    "Resource": [
      "arn:aws:rds-db:${AWS_REGION}:${ACCOUNT_ID}:dbuser:${PG_RESOURCE_ID}/${DB_IAM_USER}",
      "arn:aws:rds-db:${AWS_REGION}:${ACCOUNT_ID}:dbuser:${MYSQL_RESOURCE_ID}/${DB_IAM_USER}"
    ]
  }]
}
EOF
)"

aws iam put-user-policy \
  --user-name "$IAM_TEST_USER" \
  --policy-name "$POLICY_NAME" \
  --policy-document "$POLICY_DOC"

echo "Provision complete."
emit pg_host       "$PG_HOST"
emit pg_port       "5432"
emit pg_iam_user   "$DB_IAM_USER"
emit mysql_host    "$MYSQL_HOST"
emit mysql_port    "3306"
emit mysql_iam_user "$DB_IAM_USER"
