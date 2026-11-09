# Samba Active Directory Domain Controller used only for the MongoDB Kerberos integration
# test (see ../../../.github/workflows/mongodb-kerberos-tests.yaml). It provides both a
# Kerberos KDC and an AD-compatible LDAP directory.
FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# krb5-config/krb5-user prompt for a realm interactively; preseed to stay non-interactive.
RUN echo "krb5-config krb5-config/default_realm string BKS.TEST" | debconf-set-selections \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        samba samba-ad-provision samba-dsdb-modules samba-vfs-modules \
        smbclient krb5-user winbind attr acl \
        ca-certificates procps iproute2 dnsutils \
    && rm -rf /var/lib/apt/lists/*

# Build context is the parent dir (dev/docker_mongodb_kerberos) -- see
# docker-compose.yml build.context.
COPY samba/provision.sh /usr/local/bin/provision.sh
RUN chmod +x /usr/local/bin/provision.sh

# DNS, Kerberos (88), LDAP (389/636), kpasswd (464), SMB (445).
EXPOSE 53 53/udp 88 88/udp 389 389/udp 445 464 464/udp 636

ENTRYPOINT ["/usr/local/bin/provision.sh"]
