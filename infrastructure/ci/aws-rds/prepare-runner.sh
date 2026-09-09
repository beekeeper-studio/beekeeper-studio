#! /bin/bash
# Run by each test matrix job before jest. Authorizes this runner's
# public IP onto the per-run SG, then makes a real IAM-authenticated
# query against each engine so jest's first pool.connect() doesn't have
# to absorb SG-rule propagation lag or first-connection SSL/IAM
# warm-up costs.
#
# Required env: SG_ID, PG_HOST, PG_PORT, MYSQL_HOST, MYSQL_PORT,
# AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (the last two
# come from the bks-ci-tests user — same creds the tests use, so this
# also serves as a pre-flight credential check).

set -euo pipefail

: "${SG_ID:?SG_ID must be set}"
: "${PG_HOST:?PG_HOST must be set}"
: "${PG_PORT:?PG_PORT must be set}"
: "${MYSQL_HOST:?MYSQL_HOST must be set}"
: "${MYSQL_PORT:?MYSQL_PORT must be set}"
: "${AWS_REGION:?AWS_REGION must be set}"

DB_USER="${DB_IAM_USER:-bks_iam_user}"

echo "Resolving runner IP..."
IP="$(curl --silent --fail --max-time 10 https://api.ipify.org)"
[[ -z "$IP" ]] && { echo "Failed to determine runner IP" >&2; exit 1; }

echo "Authorizing $IP/32 on $SG_ID..."
# Tolerate InvalidPermission.Duplicate so the script is safe to re-run.
if ! aws ec2 authorize-security-group-ingress \
      --group-id "$SG_ID" \
      --ip-permissions \
        "IpProtocol=tcp,FromPort=$PG_PORT,ToPort=$PG_PORT,IpRanges=[{CidrIp=$IP/32}]" \
        "IpProtocol=tcp,FromPort=$MYSQL_PORT,ToPort=$MYSQL_PORT,IpRanges=[{CidrIp=$IP/32}]" \
      2> /tmp/sg-auth-err; then
  if grep -q 'InvalidPermission.Duplicate' /tmp/sg-auth-err; then
    echo "  (rule already present, continuing)"
  else
    cat /tmp/sg-auth-err >&2
    exit 1
  fi
fi

# IAM-authenticated SELECT 1 with retries. This warms up SSL session
# state on the runner side and verifies the cred + token + DB grant
# chain end-to-end before jest runs.
warmup_pg() {
  local token
  token="$(aws rds generate-db-auth-token \
    --hostname "$PG_HOST" --port "$PG_PORT" \
    --username "$DB_USER" --region "$AWS_REGION")"
  PGPASSWORD="$token" PGSSLMODE=require psql \
    --host "$PG_HOST" --port "$PG_PORT" \
    --username "$DB_USER" --dbname banana_key \
    --set ON_ERROR_STOP=1 \
    -c "SELECT 1" >/dev/null
}

warmup_mysql() {
  local token
  token="$(aws rds generate-db-auth-token \
    --hostname "$MYSQL_HOST" --port "$MYSQL_PORT" \
    --username "$DB_USER" --region "$AWS_REGION")"
  mysql --host "$MYSQL_HOST" --port "$MYSQL_PORT" \
    --user "$DB_USER" --password="$token" \
    --ssl-mode=REQUIRED --enable-cleartext-plugin \
    --database banana_key \
    --execute "SELECT 1" >/dev/null
}

echo "Warming up IAM-authenticated connections (up to 30s)..."
for attempt in 1 2 3 4 5 6; do
  if warmup_pg 2>/tmp/pg-warmup-err && warmup_mysql 2>/tmp/mysql-warmup-err; then
    echo "  Both engines accepted IAM auth on attempt $attempt."
    exit 0
  fi
  echo "  attempt $attempt failed:"
  [[ -s /tmp/pg-warmup-err ]] && sed 's/^/    pg: /' /tmp/pg-warmup-err
  [[ -s /tmp/mysql-warmup-err ]] && sed 's/^/    mysql: /' /tmp/mysql-warmup-err
  sleep 5
done

echo "RDS endpoints not IAM-reachable from this runner after 30s." >&2
exit 1

