#! /bin/bash
# Tears down the RDS instances + security group + IAM policy created by
# provision.sh for $RUN_ID. Safe to re-run; each step tolerates the
# resource already being absent. Exits non-zero only if the security
# group can't be deleted at the end (the meaningful "RDS hasn't released
# its ENI yet" signal).

set -uo pipefail

: "${RUN_ID:?RUN_ID must be set}"
: "${AWS_REGION:?AWS_REGION must be set}"

IAM_TEST_USER="${IAM_TEST_USER:-bks-ci-tests}"

PG_ID="bks-ci-pg-${RUN_ID}"
MYSQL_ID="bks-ci-mysql-${RUN_ID}"
SG_NAME="bks-ci-rds-${RUN_ID}"
POLICY_NAME="bks-ci-rds-connect-${RUN_ID}"

echo "Removing IAM policy $POLICY_NAME from $IAM_TEST_USER..."
aws iam delete-user-policy \
  --user-name "$IAM_TEST_USER" \
  --policy-name "$POLICY_NAME" 2>/dev/null || echo "  (policy already absent)"

delete_instance() {
  local id="$1"
  echo "Deleting RDS instance $id..."
  aws rds delete-db-instance \
    --db-instance-identifier "$id" \
    --skip-final-snapshot \
    --delete-automated-backups \
    >/dev/null 2>&1 || echo "  ($id already absent or being deleted)"
}

delete_instance "$PG_ID"
delete_instance "$MYSQL_ID"

echo "Waiting for instances to be fully deleted..."
aws rds wait db-instance-deleted --db-instance-identifier "$PG_ID"    2>/dev/null || true
aws rds wait db-instance-deleted --db-instance-identifier "$MYSQL_ID" 2>/dev/null || true

echo "Deleting security group $SG_NAME..."
SG_ID="$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=$SG_NAME" \
  --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo None)"

if [[ "$SG_ID" == "None" || -z "$SG_ID" ]]; then
  echo "  (security group already absent)"
  exit 0
fi

# RDS sometimes lingers on its ENI for a minute after the instance reports
# deleted. Retry a few times before giving up — that's the signal the
# janitor is looking for.
for attempt in 1 2 3 4 5; do
  if aws ec2 delete-security-group --group-id "$SG_ID" 2>/dev/null; then
    echo "  deleted on attempt $attempt"
    exit 0
  fi
  echo "  attempt $attempt failed, retrying in 30s..."
  sleep 30
done

echo "Failed to delete security group $SG_ID after 5 attempts." >&2
exit 1
