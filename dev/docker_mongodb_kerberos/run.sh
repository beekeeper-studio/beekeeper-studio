#!/bin/bash
# Runs the MongoDB Kerberos integration test end-to-end with nothing but Docker on the host.
# Builds the stack, runs the dockerized Jest client (which brings up the Samba AD DC +
# MongoDB Enterprise via depends_on), prints diagnostics on failure, and tears everything
# down.
#
# Usage: dev/docker_mongodb_kerberos/run.sh
# The GitHub workflow calls this same script, so CI and local runs are identical.
set -euo pipefail

cd "$(dirname "$0")"
COMPOSE=(docker compose -f docker-compose.yml)

dump_diagnostics() {
  echo "::group::diagnostics"
  "${COMPOSE[@]}" ps || true
  echo "----- samba logs -----"; "${COMPOSE[@]}" logs samba --tail 200 || true
  echo "----- mongodb logs -----"; "${COMPOSE[@]}" logs mongodb --tail 200 || true
  echo "::endgroup::"
}

rc=0
"${COMPOSE[@]}" --profile test build
"${COMPOSE[@]}" --profile test run --rm tests || rc=$?

if [ "${rc}" -ne 0 ]; then
  dump_diagnostics
fi

"${COMPOSE[@]}" --profile test down -v || true
exit "${rc}"
