#!/bin/bash
# Provisions a throwaway Samba AD domain (realm BKS.TEST) on first boot, creates the
# SQL Server service account + a Kerberos test user, registers the MSSQLSvc SPNs, and
# exports a keytab to the shared volume for the SQL Server container to consume.
#
# Everything here is test-only and the credentials are intentionally hardcoded -- this
# domain never leaves CI / local docker.
set -euo pipefail

REALM="BKS.TEST"
DOMAIN="BKS"
ADMIN_PASS="Beekeeper*1Admin"
SVC_USER="sqlsvc"
SVC_PASS="Beekeeper*1Svc"
TEST_USER="testuser"
TEST_PASS="Beekeeper*1User"
MSSQL_FQDN="mssql.bks.test"
SHARED="/shared"
KEYTAB="${SHARED}/mssql.keytab"
READY="${SHARED}/keytab.ready"

if [ ! -f /var/lib/samba/private/sam.ldb ]; then
  echo "::group::Provisioning Samba AD domain ${REALM}"
  rm -f /etc/samba/smb.conf

  samba-tool domain provision \
    --use-rfc2307 \
    --realm="${REALM}" \
    --domain="${DOMAIN}" \
    --server-role=dc \
    --dns-backend=SAMBA_INTERNAL \
    --adminpass="${ADMIN_PASS}"

  # Samba writes a realm-correct krb5.conf during provisioning; use it for local tools.
  cp -f /var/lib/samba/private/krb5.conf /etc/krb5.conf
  echo "::endgroup::"

  echo "::group::Creating accounts and SPNs"
  samba-tool user create "${SVC_USER}" "${SVC_PASS}" --description="SQL Server service account"
  samba-tool user create "${TEST_USER}" "${TEST_PASS}" --description="Kerberos test user"
  samba-tool user setexpiry "${SVC_USER}" --noexpiry
  samba-tool user setexpiry "${TEST_USER}" --noexpiry

  # The client requests a service ticket for the SQL Server SPN. Register both the bare
  # and the port-qualified forms because different client stacks compose the SPN
  # differently. The SPNs are owned by the privileged account SQL Server binds as.
  samba-tool spn add "MSSQLSvc/${MSSQL_FQDN}" "${SVC_USER}"
  samba-tool spn add "MSSQLSvc/${MSSQL_FQDN}:1433" "${SVC_USER}"
  echo "::endgroup::"

  echo "::group::Exporting keytab to ${KEYTAB}"
  rm -f "${KEYTAB}"
  # Full export writes an entry for every principal in the domain, including the
  # MSSQLSvc/* SPN entries keyed with the service account's key -- which is exactly what
  # SQL Server needs to decrypt inbound service tickets. It is a throwaway test domain,
  # so exporting everything is acceptable and avoids per-Samba-version SPN export quirks.
  samba-tool domain exportkeytab "${KEYTAB}"
  chmod 644 "${KEYTAB}"
  echo "Keytab principals:"
  klist -k "${KEYTAB}" || true
  echo "::endgroup::"

  touch "${READY}"
  echo "Samba provisioning complete; keytab ready."
else
  echo "Existing Samba domain found; skipping provision."
  [ -f "${KEYTAB}" ] && touch "${READY}"
fi

exec samba -i --no-process-group
