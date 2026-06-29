#!/bin/bash
# Installs the mongodb/<host> keytab, starts MongoDB Enterprise with GSSAPI enabled, and
# creates the $external Kerberos user via the localhost exception. Runs as root, then drops
# to the mongodb user for mongod (which refuses to run as root by default).
# Not `set -e`: push through and surface diagnostics rather than abort silently.
set -uxo pipefail

KEYTAB_SRC="/shared/mongodb.keytab"
KEYTAB_DST="/etc/mongodb.keytab"
READY_SRC="/shared/keytab.ready"
SASL_HOST="mongodb.bks.test"
SASL_SERVICE="mongodb"
DBPATH="/var/lib/mongodb"

echo "Waiting for the Samba keytab on the shared volume ..."
for _ in $(seq 1 120); do
  if [ -f "${READY_SRC}" ] && [ -f "${KEYTAB_SRC}" ]; then break; fi
  sleep 2
done
[ -f "${KEYTAB_SRC}" ] || { echo "ERROR: keytab never appeared at ${KEYTAB_SRC}" >&2; exit 1; }

echo "::group::Install MongoDB service keytab"
cp "${KEYTAB_SRC}" "${KEYTAB_DST}"
chown mongodb:mongodb "${KEYTAB_DST}"
chmod 400 "${KEYTAB_DST}"
klist -k "${KEYTAB_DST}" || true
echo "::endgroup::"

# mongod reads its service key from the keytab named by KRB5_KTNAME. saslHostName pins the
# SPN host so it matches mongodb/mongodb.bks.test regardless of how the container resolves
# its own name. SCRAM stays enabled alongside GSSAPI only so routine tooling still works.
echo "Starting MongoDB ..."
su mongodb -s /bin/bash -c "KRB5_KTNAME=${KEYTAB_DST} exec mongod \
  --dbpath ${DBPATH} \
  --bind_ip_all \
  --auth \
  --setParameter authenticationMechanisms=GSSAPI,SCRAM-SHA-256 \
  --setParameter saslHostName=${SASL_HOST} \
  --setParameter saslServiceName=${SASL_SERVICE}" &
MONGOPID=$!

echo "Waiting for mongod to accept connections ..."
for _ in $(seq 1 60); do
  if mongosh --host localhost --quiet --eval "db.adminCommand('ping')" >/dev/null 2>&1; then break; fi
  sleep 2
done

# Create the Kerberos-mapped $external user via the localhost exception (allowed only while
# no users exist yet). After this the exception closes.
echo "Creating the $external Kerberos user ..."
mongosh --host localhost --quiet --file /usr/local/bin/setup.js \
  || echo "WARNING: setup.js failed -- the testuser@BKS.TEST login may be missing."

# Readiness marker (engine up + user created) for the compose healthcheck.
touch /tmp/mongodb.ready

wait "${MONGOPID}"
