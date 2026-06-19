#!/bin/bash
# Waits for the Samba-exported keytab, configures SQL Server for AD/Kerberos auth via
# mssql-conf, starts the engine, and creates the Kerberos-mapped login. Runs as the
# mssql user (the image's default), which owns /var/opt/mssql and can edit mssql.conf.
set -euo pipefail

KEYTAB_SRC="/shared/mssql.keytab"
KEYTAB_DST="/var/opt/mssql/secrets/mssql.keytab"
READY="/shared/keytab.ready"
SVC_USER="sqlsvc"
SQLCMD="/opt/mssql-tools18/bin/sqlcmd"

echo "Waiting for the Samba keytab on the shared volume ..."
for _ in $(seq 1 120); do
  if [ -f "${READY}" ] && [ -f "${KEYTAB_SRC}" ]; then break; fi
  sleep 2
done
if [ ! -f "${KEYTAB_SRC}" ]; then
  echo "ERROR: keytab never appeared at ${KEYTAB_SRC}" >&2
  exit 1
fi

mkdir -p /var/opt/mssql/secrets
cp "${KEYTAB_SRC}" "${KEYTAB_DST}"
# SQL Server refuses a keytab that is readable by anyone but its own account.
chmod 400 "${KEYTAB_DST}"

# Delegate authentication to the OS Kerberos/keytab stack. These write to
# /var/opt/mssql/mssql.conf (owned by mssql).
/opt/mssql/bin/mssql-conf set network.privilegedadaccount "${SVC_USER}"
/opt/mssql/bin/mssql-conf set network.kerberoskeytabfile "${KEYTAB_DST}"

# Start the engine in the background so we can run setup.sql once it accepts connections.
/opt/mssql/bin/sqlservr &
SQLPID=$!

echo "Waiting for SQL Server to accept connections ..."
for _ in $(seq 1 60); do
  if "${SQLCMD}" -S localhost -U sa -P "${MSSQL_SA_PASSWORD}" -C -Q "SELECT 1" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "Creating the Kerberos-mapped login ..."
if ! "${SQLCMD}" -S localhost -U sa -P "${MSSQL_SA_PASSWORD}" -C -b -i /usr/local/bin/setup.sql; then
  echo "WARNING: setup.sql failed -- the [BKS\\testuser] login may be missing." >&2
fi

# Hand the foreground back to the engine so the container's lifecycle tracks it.
wait "${SQLPID}"
