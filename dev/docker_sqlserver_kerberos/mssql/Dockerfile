# SQL Server on Linux configured for Active Directory / Kerberos authentication against
# the companion Samba AD DC. Two layers are required for a working integrated login:
#   1. SSSD joined to the domain (adcli) -- gives SQL Server AD *trust* + principal->login
#      mapping; without it logins are rejected as "from an untrusted domain".
#   2. A keytab for the MSSQLSvc SPN + mssql-conf network settings -- the Kerberos service
#      credential SQL Server uses to accept inbound tickets.
# The entrypoint runs as root (join + SSSD need it) and drops to the mssql user for sqlservr.
FROM mcr.microsoft.com/mssql/server:2022-latest

USER root

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        krb5-user adcli sssd sssd-tools sssd-ad libnss-sss libpam-sss \
        ldap-utils dnsutils iproute2 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY krb5.conf /etc/krb5.conf
COPY mssql/sssd.conf /etc/sssd/sssd.conf
COPY mssql/entrypoint.sh /usr/local/bin/kerberos-entrypoint.sh
COPY mssql/setup.sql /usr/local/bin/setup.sql
RUN chmod +x /usr/local/bin/kerberos-entrypoint.sh && chmod 600 /etc/sssd/sssd.conf

ENTRYPOINT ["/usr/local/bin/kerberos-entrypoint.sh"]
