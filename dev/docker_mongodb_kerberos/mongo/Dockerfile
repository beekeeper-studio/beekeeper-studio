# MongoDB Enterprise Server configured for Kerberos (GSSAPI) authentication against the
# companion Samba AD DC. GSSAPI is an Enterprise-only feature. Two pieces are required:
#   1. The Cyrus SASL GSSAPI plugin (libsasl2-modules-gssapi-mit) -- mongod negotiates
#      GSSAPI through Cyrus SASL on Linux.
#   2. The mongodb/<host> service keytab (installed at runtime via KRB5_KTNAME) -- the
#      credential mongod uses to accept inbound service tickets.
# Built on Ubuntu (apt) to stay consistent with the samba/tests containers and to control
# the krb5 + SASL packages directly. mongosh is included so the entrypoint can create the
# $external Kerberos user via the localhost exception.
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        curl gnupg ca-certificates \
        krb5-user libsasl2-modules-gssapi-mit libsasl2-modules \
        dnsutils iproute2 procps; \
    # MongoDB Enterprise 7.0 apt repo (Ubuntu 22.04 / jammy).
    curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-enterprise-7.0.gpg; \
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-enterprise-7.0.gpg ] https://repo.mongodb.com/apt/ubuntu jammy/mongodb-enterprise/7.0 multiverse" > /etc/apt/sources.list.d/mongodb-enterprise-7.0.list; \
    apt-get update; \
    apt-get install -y --no-install-recommends mongodb-enterprise; \
    rm -rf /var/lib/apt/lists/*; \
    mkdir -p /var/lib/mongodb /var/log/mongodb; \
    chown -R mongodb:mongodb /var/lib/mongodb /var/log/mongodb

# Build context is the parent dir (dev/docker_mongodb_kerberos) -- see
# docker-compose.yml build.context.
# Kerberos client config so mongod's GSSAPI resolves the realm (BKS.TEST) and keeps the SPN
# literal. Without it the MIT krb5 library falls back to its stock default realm and DNS
# canonicalization, producing a doubled-domain SPN (mongodb.bks.test.bks.test@ATHENA.MIT.EDU)
# that has no keytab entry, and mongod aborts on startup.
COPY krb5.conf /etc/krb5.conf
COPY mongo/entrypoint.sh /usr/local/bin/kerberos-entrypoint.sh
COPY mongo/setup.js /usr/local/bin/setup.js
RUN chmod +x /usr/local/bin/kerberos-entrypoint.sh

EXPOSE 27017

ENTRYPOINT ["/usr/local/bin/kerberos-entrypoint.sh"]
