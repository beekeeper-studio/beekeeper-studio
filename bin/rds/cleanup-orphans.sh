#! /bin/bash
# Deletes any RDS instance tagged bks-ci-integration=true that's older than
# the configured age threshold. Run periodically to catch instances left
# behind by cancelled runs where the teardown job never executed.

set -euo pipefail

MAX_AGE_HOURS="${MAX_AGE_HOURS:-2}"
CUTOFF_EPOCH=$(date -u -d "${MAX_AGE_HOURS} hours ago" +%s)

mapfile -t INSTANCES < <(
  aws rds describe-db-instances \
    --query "DBInstances[?contains(TagList[?Key=='bks-ci-integration'].Value, 'true')].[DBInstanceIdentifier, InstanceCreateTime]" \
    --output text
)

if [[ ${#INSTANCES[@]} -eq 0 ]]; then
  echo "No CI-tagged instances found."
  exit 0
fi

for row in "${INSTANCES[@]}"; do
  [[ -z "$row" ]] && continue
  read -r identifier created <<<"$row"
  created_epoch=$(date -u -d "$created" +%s)
  age=$((( $(date -u +%s) - created_epoch ) / 3600))

  if [[ "$created_epoch" -lt "$CUTOFF_EPOCH" ]]; then
    echo "Deleting $identifier (age ${age}h exceeds ${MAX_AGE_HOURS}h)"
    aws rds delete-db-instance \
      --db-instance-identifier "$identifier" \
      --skip-final-snapshot \
      --delete-automated-backups \
      >/dev/null
  else
    echo "Keeping $identifier (age ${age}h)"
  fi
done
