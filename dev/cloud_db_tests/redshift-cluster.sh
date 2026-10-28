#!/bin/bash
# Resumes or pauses the Redshift cluster used by .github/workflows/cloud-db-tests.yml.
#
#   redshift-cluster.sh resume   # resume if paused, wait until available,
#                                # write host/port to $GITHUB_OUTPUT if set
#   redshift-cluster.sh pause    # wait out any transition, then pause
#
# Needs the AWS CLI with credentials, and REDSHIFT_CLUSTER_IDENTIFIER.
# A cluster only accepts resume-cluster while paused and pause-cluster while
# available, so both commands first wait out transitional states (resuming,
# pausing, modifying, ...).

set -euo pipefail

ACTION="${1:-}"
CLUSTER="${REDSHIFT_CLUSTER_IDENTIFIER:?REDSHIFT_CLUSTER_IDENTIFIER is not set}"
# 60 x 30s: resuming usually takes 5-15 minutes.
MAX_POLLS="${REDSHIFT_MAX_POLLS:-60}"
POLL_SECONDS="${REDSHIFT_POLL_SECONDS:-30}"

cluster_status() {
  aws redshift describe-clusters \
    --cluster-identifier "$CLUSTER" \
    --query 'Clusters[0].ClusterStatus' \
    --output text
}

# Waits until the cluster is in one of the given states and prints it.
wait_for() {
  local status
  for ((i = 0; i < MAX_POLLS; i++)); do
    status="$(cluster_status)"
    for wanted in "$@"; do
      if [[ "$status" == "$wanted" ]]; then
        echo "$status"
        return 0
      fi
    done
    echo "Cluster $CLUSTER is '$status', waiting for: $*" >&2
    sleep "$POLL_SECONDS"
  done
  echo "Timed out waiting for cluster $CLUSTER to be: $*" >&2
  return 1
}

case "$ACTION" in
  resume)
    status="$(wait_for available paused)"
    if [[ "$status" == "paused" ]]; then
      echo "Resuming $CLUSTER"
      aws redshift resume-cluster --cluster-identifier "$CLUSTER" > /dev/null
      wait_for available > /dev/null
    fi
    echo "Cluster $CLUSTER is available"

    host="$(aws redshift describe-clusters --cluster-identifier "$CLUSTER" \
      --query 'Clusters[0].Endpoint.Address' --output text)"
    port="$(aws redshift describe-clusters --cluster-identifier "$CLUSTER" \
      --query 'Clusters[0].Endpoint.Port' --output text)"
    echo "Endpoint: $host:$port"
    if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
      echo "host=$host" >> "$GITHUB_OUTPUT"
      echo "port=$port" >> "$GITHUB_OUTPUT"
    fi
    ;;
  pause)
    status="$(wait_for available paused)"
    if [[ "$status" == "available" ]]; then
      echo "Pausing $CLUSTER"
      aws redshift pause-cluster --cluster-identifier "$CLUSTER" > /dev/null
    else
      echo "Cluster $CLUSTER is already paused"
    fi
    ;;
  *)
    echo "Usage: $0 resume|pause" >&2
    exit 2
    ;;
esac
