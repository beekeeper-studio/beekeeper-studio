#!/bin/bash
# Provisions a throwaway Samba AD domain (realm BKS.TEST) on first boot, creates the
# MongoDB service account + a Kerberos test user, registers the mongodb/<host> SPN, and
# exports a keytab to the shared volume for the MongoDB container to consume.
#
# Everything here is test-only and the credentials are intentionally hardcoded -- this
# domain never leaves CI / local docker.
set -euo pipefail

REALM="BKS.TEST"
DOMAIN="BKS"
ADMIN_PASS="Beekeeper*1Admin"
SVC_USER="mongosvc"
SVC_PASS="Beekeeper*1Svc"
TEST_USER="testuser"
TEST_PASS="Beekeeper*1User"
MONGO_FQDN="mongodb.bks.test"
SHARED="/shared"
KEYTAB="${SHARED}/mongodb.keytab"
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

  echo "::group::Creating accounts and SPN"
  samba-tool user create "${SVC_USER}" "${SVC_PASS}" --description="MongoDB service account"
  samba-tool user create "${TEST_USER}" "${TEST_PASS}" --description="Kerberos test user"
  samba-tool user setexpiry "${SVC_USER}" --noexpiry
  samba-tool user setexpiry "${TEST_USER}" --noexpiry

  # The client requests a service ticket for the MongoDB SPN. MongoDB's default service
  # name is "mongodb", so the SPN is mongodb/<fqdn>. It is owned by the service account
  # whose key ends up in the exported keytab.
  samba-tool spn add "mongodb/${MONGO_FQDN}" "${SVC_USER}"
  echo "::endgroup::"

  echo "::group::Exporting keytab to ${KEYTAB}"
  rm -f "${KEYTAB}"
  # Export the SPN principal specifically. A plain `exportkeytab` (no --principal) keys every
  # entry by the account's sAMAccountName (mongosvc@BKS.TEST) and never emits the SPN form,
  # so mongod's GSSAPI cannot acquire credentials for mongodb/<fqdn>@REALM and aborts on
  # startup. Naming the principal makes Samba write the mongodb/<fqdn>@REALM entry mongod
  # needs to decrypt inbound service tickets. The test client authenticates the user via
  # password kinit, so it does not need any further entries here.
  samba-tool domain exportkeytab "${KEYTAB}" --principal="mongodb/${MONGO_FQDN}"
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
