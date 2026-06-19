#!/bin/bash
# Runs the SQL Server Kerberos integration test end-to-end with nothing but Docker on the
# host. Builds the stack, runs the dockerized Jest client (which brings up the Samba AD DC
# + SQL Server via depends_on), prints diagnostics on failure, and tears everything down.
#
# Usage: dev/docker_sqlserver_kerberos/run.sh
# The GitHub workflow calls this same script, so CI and local runs are identical.
set -euo pipefail

cd "$(dirname "$0")"
COMPOSE=(docker compose -f docker-compose.yml)

dump_diagnostics() {
  echo "::group::diagnostics"
  "${COMPOSE[@]}" ps || true
  echo "----- samba logs -----"; "${COMPOSE[@]}" logs samba --tail 200 || true
  echo "----- mssql logs -----"; "${COMPOSE[@]}" logs mssql --tail 200 || true
  echo "----- SQL Server ERRORLOG -----"
  "${COMPOSE[@]}" exec -T mssql bash -lc 'tail -n 200 /var/opt/mssql/log/errorlog' || true
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
