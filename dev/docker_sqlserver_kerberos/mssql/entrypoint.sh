#!/bin/bash
# Joins the host to the Samba AD domain (SSSD) so SQL Server trusts the realm and can map
# the Kerberos principal to a login, installs the MSSQLSvc keytab + AD config, then starts
# the engine (as the mssql user) and creates the Kerberos-mapped login. Runs as root.
# Not `set -e`: we want to push through and surface diagnostics rather than abort silently.
set -uxo pipefail

# shellcheck disable=SC2034  # kept for reference/parity with DOMAIN_DNS; documents the AD realm
REALM="BKS.TEST"
DOMAIN_DNS="bks.test"
ADMIN_USER="Administrator"
ADMIN_PASS="Beekeeper*1Admin"
SVC_USER="sqlsvc"
KEYTAB_SRC="/shared/mssql.keytab"
KEYTAB_DST="/var/opt/mssql/secrets/mssql.keytab"
READY="/shared/keytab.ready"
SQLCMD="/opt/mssql-tools18/bin/sqlcmd"

echo "Waiting for the Samba keytab on the shared volume ..."
for _ in $(seq 1 120); do
  if [ -f "${READY}" ] && [ -f "${KEYTAB_SRC}" ]; then break; fi
  sleep 2
done
[ -f "${KEYTAB_SRC}" ] || { echo "ERROR: keytab never appeared at ${KEYTAB_SRC}" >&2; exit 1; }

echo "::group::Join AD domain ${DOMAIN_DNS} (adcli + SSSD)"
# Creates the machine account + /etc/krb5.keytab SSSD authenticates with.
echo "${ADMIN_PASS}" | adcli join "${DOMAIN_DNS}" --login-user "${ADMIN_USER}" --stdin-password -v \
  || echo "WARNING: adcli join reported a problem"

# Route passwd/group through SSSD so SQL Server can resolve AD principals.
grep -q 'sss' /etc/nsswitch.conf || sed -i -E 's/^(passwd:.*)$/\1 sss/; s/^(group:.*)$/\1 sss/' /etc/nsswitch.conf
mkdir -p /var/lib/sss/db /var/lib/sss/mc /var/lib/sss/pipes
sssd -i -d 2 &
# shellcheck disable=SC2034  # background sssd pid captured for debugging; not waited on
SSSD_PID=$!
sleep 5
echo "AD principal resolution check:"
id "testuser@${DOMAIN_DNS}" || getent passwd "testuser@${DOMAIN_DNS}" || echo "testuser not yet resolvable via SSSD"
echo "::endgroup::"

echo "::group::Configure SQL Server AD/Kerberos"
mkdir -p /var/opt/mssql/secrets
cp "${KEYTAB_SRC}" "${KEYTAB_DST}"
chown mssql:mssql "${KEYTAB_DST}"
chmod 400 "${KEYTAB_DST}"
/opt/mssql/bin/mssql-conf set network.privilegedadaccount "${SVC_USER}"
/opt/mssql/bin/mssql-conf set network.kerberoskeytabfile "${KEYTAB_DST}"
echo "::endgroup::"

# sqlservr refuses to run as root, so start it as the mssql user. su (without -l) preserves
# the MSSQL_* environment on Debian; HOME is set explicitly for the engine.
echo "Starting SQL Server ..."
su mssql -s /bin/bash -c 'HOME=/var/opt/mssql exec /opt/mssql/bin/sqlservr' &
SQLPID=$!

echo "Waiting for SQL Server to accept connections ..."
for _ in $(seq 1 60); do
  if "${SQLCMD}" -S localhost -U sa -P "${MSSQL_SA_PASSWORD}" -C -Q "SELECT 1" >/dev/null 2>&1; then break; fi
  sleep 2
done

echo "Creating the Kerberos-mapped login ..."
"${SQLCMD}" -S localhost -U sa -P "${MSSQL_SA_PASSWORD}" -C -b -i /usr/local/bin/setup.sql \
  || echo "WARNING: setup.sql failed -- the [BKS\\testuser] login may be missing."

# Readiness marker (engine up + login created) for the compose healthcheck.
touch /var/opt/mssql/mssql.ready

wait "${SQLPID}"
