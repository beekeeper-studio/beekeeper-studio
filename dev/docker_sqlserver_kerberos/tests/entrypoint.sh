#!/bin/bash
# Runs inside the dockerized test runner: installs workspace deps (first run only),
# obtains a Kerberos ticket for the test principal against the in-network KDC, confirms
# the SQL Server login negotiates KERBEROS, then runs the Jest spec. Everything here is
# inside the Docker network, so no host /etc/hosts or /etc/krb5.conf edits are involved.
set -euo pipefail

cd /app

# node_modules live in container-private volumes; populate them on first run.
if [ ! -d /app/node_modules/jest ]; then
  echo "::group::yarn install (first run)"
  yarn install --frozen-lockfile --network-timeout 100000
  echo "::endgroup::"
fi

echo "::group::kinit ${KRB_TEST_USER}@${KRB_REALM}"
echo "${KRB_TEST_PASS}" | kinit "${KRB_TEST_USER}@${KRB_REALM}"
klist
echo "::endgroup::"

echo "::group::Pre-flight: wait for SQL Server and confirm KERBEROS"
# The mssql container creates the [BKS\testuser] login after it starts accepting
# connections, so poll until integrated auth succeeds and reports KERBEROS.
deadline=$(( $(date +%s) + 180 ))
scheme=""
while [ "$(date +%s)" -lt "${deadline}" ]; do
  scheme=$(sqlcmd -S "${SQLSERVER_KERBEROS_HOST},${SQLSERVER_KERBEROS_PORT}" -E -C -h -1 -W \
    -Q "SET NOCOUNT ON; SELECT auth_scheme FROM sys.dm_exec_connections WHERE session_id = @@SPID;" 2>/dev/null | tr -d '[:space:]' || true)
  if [ "${scheme}" = "KERBEROS" ]; then break; fi
  sleep 3
done
echo "Negotiated auth_scheme: '${scheme}'"
if [ "${scheme}" != "KERBEROS" ]; then
  echo "ERROR: integrated auth did not negotiate KERBEROS before the deadline." >&2
  exit 1
fi
echo "::endgroup::"

cd /app/apps/studio

# Run the suite, capturing a machine-readable summary alongside the normal output.
RESULT_FILE=/tmp/jest-kerberos.json
set +e
yarn internal:integration \
  --testPathPattern sqlserver-kerberos \
  --runInBand --ci --forceExit --testTimeout=90000 \
  --json --outputFile="${RESULT_FILE}"
JEST_RC=$?
set -e

# Hard guard against the silent-skip trap: the suite is gated on SQLSERVER_KERBEROS_TEST
# via describe.skip, so if that env var failed to reach Jest the suite would skip and CI
# would go green having tested nothing. A skipped suite is indistinguishable from a passing
# one, so require that Kerberos tests actually executed and that none were skipped.
node -e '
  const fs = require("fs");
  const r = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  console.log(`jest: suites=${r.numTotalTestSuites} passed=${r.numPassedTests} ` +
              `failed=${r.numFailedTests} skipped=${r.numPendingTests}`);
  if (r.numTotalTestSuites < 1) { console.error("GUARD: no Kerberos suite ran"); process.exit(1); }
  if (r.numPassedTests < 1) { console.error("GUARD: no Kerberos tests executed (suite skipped?)"); process.exit(1); }
  if (r.numPendingTests > 0) { console.error("GUARD: Kerberos tests were skipped"); process.exit(1); }
' "${RESULT_FILE}"

exit "${JEST_RC}"
