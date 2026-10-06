# Self-contained Jest runner for the SQL Server Kerberos integration test. Carries the
# Microsoft ODBC Driver 18 (the GSSAPI/Kerberos client path msnodesqlv8 uses), the MIT
# Kerberos client, and Electron's runtime shared libraries (the test harness launches
# `electron` with ELECTRON_RUN_AS_NODE). Source and node_modules are mounted at runtime
# (see docker-compose.yml), so only system dependencies are baked here.
FROM node:22-bookworm

ENV DEBIAN_FRONTEND=noninteractive

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        curl gnupg ca-certificates apt-transport-https \
        build-essential python3 git \
        krb5-user unixodbc-dev \
        # Electron runtime libraries (needed even with ELECTRON_RUN_AS_NODE).
        libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libgbm1 \
        libgtk-3-0 libasound2 libxcomposite1 libxdamage1 libxrandr2 libxfixes3 \
        libxkbcommon0 libxshmfence1 libpango-1.0-0 libcairo2 libx11-xcb1; \
    # Microsoft ODBC Driver 18 + sqlcmd (Debian 12 / bookworm feed).
    curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg; \
    curl -fsSL https://packages.microsoft.com/config/debian/12/prod.list > /etc/apt/sources.list.d/mssql-release.list; \
    apt-get update; \
    ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 mssql-tools18; \
    rm -rf /var/lib/apt/lists/*

ENV PATH="/opt/mssql-tools18/bin:${PATH}"

# yarn 1.x ships with the node image; corepack is a belt-and-suspenders fallback.
RUN corepack enable || true

COPY tests/entrypoint.sh /usr/local/bin/run-kerberos-tests.sh
RUN chmod +x /usr/local/bin/run-kerberos-tests.sh

WORKDIR /app
ENTRYPOINT ["/usr/local/bin/run-kerberos-tests.sh"]
