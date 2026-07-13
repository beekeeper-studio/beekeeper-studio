#!/bin/bash
# Runs inside the dockerized test runner: installs workspace deps (first run only), obtains
# a Kerberos ticket for the test principal against the in-network KDC, confirms MongoDB
# accepts a GSSAPI login, then runs the Jest spec. Everything here is inside the Docker
# network, so no host /etc/hosts or /etc/krb5.conf edits are involved.
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

GSSAPI_URI="mongodb://${KRB_TEST_USER}%40${KRB_REALM}@${MONGODB_KERBEROS_HOST}:${MONGODB_KERBEROS_PORT}/?authMechanism=GSSAPI&authMechanismProperties=SERVICE_NAME:${MONGODB_KERBEROS_SERVICE}&authSource=\$external"

echo "::group::Pre-flight: wait for MongoDB and confirm a GSSAPI login"
# The mongodb container creates the testuser@BKS.TEST $external user after it starts
# accepting connections, so poll until a GSSAPI auth succeeds.
deadline=$(( $(date +%s) + 180 ))
ok=""
while [ "$(date +%s)" -lt "${deadline}" ]; do
  if mongosh "${GSSAPI_URI}" --quiet --eval "db.runCommand({ connectionStatus: 1 }).authInfo.authenticatedUsers" 2>/dev/null | grep -q "${KRB_TEST_USER}@${KRB_REALM}"; then
    ok="yes"; break
  fi
  sleep 3
done
if [ -z "${ok}" ]; then
  echo "ERROR: GSSAPI login did not succeed before the deadline." >&2
  exit 1
fi
echo "GSSAPI pre-flight OK."
echo "::endgroup::"

cd /app/apps/studio

# Run the suite, capturing a machine-readable summary alongside the normal output.
RESULT_FILE=/tmp/jest-kerberos.json
set +e
yarn internal:integration \
  --testPathPattern mongodb-kerberos \
  --runInBand --ci --forceExit --testTimeout=90000 \
  --json --outputFile="${RESULT_FILE}"
JEST_RC=$?
set -e

# Hard guard against the silent-skip trap: the suite is gated on MONGODB_KERBEROS_TEST via
# describe.skip, so if that env var failed to reach Jest the suite would skip and CI would
# go green having tested nothing. A skipped suite is indistinguishable from a passing one,
# so require that Kerberos tests actually executed and that none were skipped.
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
