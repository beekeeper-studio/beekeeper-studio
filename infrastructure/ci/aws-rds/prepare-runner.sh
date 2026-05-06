#! /bin/bash
# Run by each test matrix job before jest. Authorizes this runner's
# public IP onto the per-run SG, then waits until both engines are
# TCP-reachable so the spec doesn't have to care about SG-rule
# propagation lag (which has caused the first pool.connect() to time
# out).
#
# Required env: SG_ID, PG_HOST, PG_PORT, MYSQL_HOST, MYSQL_PORT, AWS_REGION.

set -euo pipefail

: "${SG_ID:?SG_ID must be set}"
: "${PG_HOST:?PG_HOST must be set}"
: "${PG_PORT:?PG_PORT must be set}"
: "${MYSQL_HOST:?MYSQL_HOST must be set}"
: "${MYSQL_PORT:?MYSQL_PORT must be set}"
: "${AWS_REGION:?AWS_REGION must be set}"

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

probe() {
  timeout 5 bash -c "echo > /dev/tcp/$1/$2" 2>/dev/null
}

echo "Probing reachability (up to 30s)..."
for attempt in 1 2 3 4 5 6; do
  if probe "$PG_HOST" "$PG_PORT" && probe "$MYSQL_HOST" "$MYSQL_PORT"; then
    echo "  Both engines reachable on attempt $attempt."
    exit 0
  fi
  echo "  attempt $attempt: not reachable, sleeping 5s..."
  sleep 5
done

echo "RDS endpoints not reachable from this runner after 30s." >&2
exit 1
