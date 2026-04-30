#! /bin/bash
# Seeds the two freshly-provisioned RDS instances with the IAM database user
# and grants. Inputs come from environment variables populated out of
# `terraform output` by the caller.

set -euo pipefail

: "${BKS_RDS_PG_HOST:?}"
: "${BKS_RDS_PG_PORT:?}"
: "${BKS_RDS_PG_MASTER_USER:?}"
: "${BKS_RDS_PG_MASTER_PASSWORD:?}"
: "${BKS_RDS_MYSQL_HOST:?}"
: "${BKS_RDS_MYSQL_PORT:?}"
: "${BKS_RDS_MYSQL_MASTER_USER:?}"
: "${BKS_RDS_MYSQL_MASTER_PASSWORD:?}"

SCRIPT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
SEED_DIR="$SCRIPT_DIR/infrastructure/ci/aws-rds/seed"

echo "Seeding Postgres..."
PGPASSWORD="$BKS_RDS_PG_MASTER_PASSWORD" psql \
  --host "$BKS_RDS_PG_HOST" \
  --port "$BKS_RDS_PG_PORT" \
  --username "$BKS_RDS_PG_MASTER_USER" \
  --dbname banana \
  --set ON_ERROR_STOP=1 \
  -f "$SEED_DIR/pg-seed.sql"

echo "Seeding MySQL..."
mysql \
  --host "$BKS_RDS_MYSQL_HOST" \
  --port "$BKS_RDS_MYSQL_PORT" \
  --user "$BKS_RDS_MYSQL_MASTER_USER" \
  --password="$BKS_RDS_MYSQL_MASTER_PASSWORD" \
  --ssl-mode=REQUIRED \
  banana < "$SEED_DIR/mysql-seed.sql"

echo "Seed complete."
