# SQL Server on Linux configured for Active Directory / Kerberos authentication against
# the companion Samba AD DC. AD-auth support is built into the mssql image; we only add
# a realm-correct krb5.conf and an entrypoint that wires up the keytab + mssql-conf and
# creates the Kerberos-mapped login.
FROM mcr.microsoft.com/mssql/server:2022-latest

USER root

# krb5 client tools are handy for in-container diagnostics. The image's apt sources are
# minimal, so this is best-effort and never required for the auth path itself.
RUN apt-get update \
    && apt-get install -y --no-install-recommends krb5-user ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    || echo "krb5-user install skipped (diagnostics only)"

# Build context is the parent dir (dev/docker_sqlserver_kerberos) so the shared
# krb5.conf is reachable -- see docker-compose.yml build.context.
COPY krb5.conf /etc/krb5.conf
COPY mssql/entrypoint.sh /usr/local/bin/kerberos-entrypoint.sh
COPY mssql/setup.sql /usr/local/bin/setup.sql
RUN chmod +x /usr/local/bin/kerberos-entrypoint.sh

USER mssql

ENTRYPOINT ["/usr/local/bin/kerberos-entrypoint.sh"]
