#! /bin/bash
# Emits the runner's current public IPv4 so Terraform can lock the RDS
# security group to it.

set -euo pipefail

IP="$(curl --silent --fail --max-time 10 https://api.ipify.org)"

if [[ -z "$IP" ]]; then
  echo "Failed to determine runner IP" >&2
  exit 1
fi

echo "runner_ip=$IP" >> "${GITHUB_OUTPUT:-/dev/stdout}"
echo "Runner IP: $IP"
