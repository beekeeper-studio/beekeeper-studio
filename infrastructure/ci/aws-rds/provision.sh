#! /bin/bash
# Provisions per-run RDS Postgres + MySQL instances for the IAM
# integration suite. All resource names derive from $RUN_ID so destroy.sh
# needs no shared state. Idempotent only insofar as a re-run with the same
# RUN_ID will fail loudly on the first CreateDBInstance — that's deliberate
# to surface unexpected leftovers rather than silently reuse them.
#
# Required env: RUN_ID, AWS_REGION. AWS credentials must already be
# configured (the workflow uses bks-ci-tests static keys; the policy
# attached to that user grants rds-db:connect on */bks_iam_user, so no
# per-run IAM grant is needed here).

set -euo pipefail

: "${RUN_ID:?RUN_ID must be set}"
: "${AWS_REGION:?AWS_REGION must be set}"

PG_ID="bks-ci-pg-${RUN_ID}"
MYSQL_ID="bks-ci-mysql-${RUN_ID}"
SG_NAME="bks-ci-rds-${RUN_ID}"
SUBNET_GROUP_NAME="bks-ci-default"

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

# Create-once / reuse-thereafter: a DB subnet group covering the default
# VPC's per-AZ default subnets. Filtering on `default-for-az` guarantees
# the picked subnets are in distinct AZs (RDS requires ≥2).
if aws rds describe-db-subnet-groups \
     --db-subnet-group-name "$SUBNET_GROUP_NAME" >/dev/null 2>&1; then
  echo "DB subnet group $SUBNET_GROUP_NAME already exists."
else
  echo "Creating DB subnet group $SUBNET_GROUP_NAME..."
  SUBNET_IDS="$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$VPC_ID" "Name=default-for-az,Values=true" \
    --query 'Subnets[*].SubnetId' --output text)"
  [[ -z "$SUBNET_IDS" ]] && { echo "No default-for-az subnets in $VPC_ID" >&2; exit 1; }
  aws rds create-db-subnet-group \
    --db-subnet-group-name "$SUBNET_GROUP_NAME" \
    --db-subnet-group-description "Shared subnet group for bks CI RDS instances" \
    --subnet-ids $SUBNET_IDS \
    >/dev/null
fi

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
    --db-subnet-group-name "$SUBNET_GROUP_NAME" \
    --tags $TAGS \
    >/dev/null
}

create_instance "$PG_ID"    postgres 16.4 5432 "$PG_PASSWORD"
create_instance "$MYSQL_ID" mysql    8.0  3306 "$MYSQL_PASSWORD"

echo "Waiting for instances to become available (this typically takes 5-8 min)..."
aws rds wait db-instance-available --db-instance-identifier "$PG_ID"
aws rds wait db-instance-available --db-instance-identifier "$MYSQL_ID"

PG_HOST="$(aws rds describe-db-instances \
  --db-instance-identifier "$PG_ID" \
  --query 'DBInstances[0].Endpoint.Address' --output text)"

MYSQL_HOST="$(aws rds describe-db-instances \
  --db-instance-identifier "$MYSQL_ID" \
  --query 'DBInstances[0].Endpoint.Address' --output text)"

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

echo "Provision complete."
emit pg_host        "$PG_HOST"
emit pg_port        "5432"
emit pg_iam_user    "bks_iam_user"
emit mysql_host     "$MYSQL_HOST"
emit mysql_port     "3306"
emit mysql_iam_user "bks_iam_user"
