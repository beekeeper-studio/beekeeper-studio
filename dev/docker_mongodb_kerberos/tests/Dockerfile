# Self-contained Jest runner for the MongoDB Kerberos integration test. Carries the MIT
# Kerberos client (kinit/klist/kdestroy the spec shells out to), the GSSAPI SASL plugin the
# mongodb driver's native `kerberos` module needs, mongosh (for a GSSAPI pre-flight), and
# Electron's runtime shared libraries (the harness launches `electron` with
# ELECTRON_RUN_AS_NODE). Source and node_modules are mounted at runtime (see
# docker-compose.yml), so only system dependencies are baked here.
FROM node:22-bookworm

ENV DEBIAN_FRONTEND=noninteractive

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        curl gnupg ca-certificates apt-transport-https \
        build-essential python3 git \
        krb5-user libsasl2-modules-gssapi-mit libsasl2-modules \
        # Electron runtime libraries (needed even with ELECTRON_RUN_AS_NODE).
        libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libgbm1 \
        libgtk-3-0 libasound2 libxcomposite1 libxdamage1 libxrandr2 libxfixes3 \
        libxkbcommon0 libxshmfence1 libpango-1.0-0 libcairo2 libx11-xcb1; \
    # mongosh from the MongoDB apt repo (Debian 12 / bookworm) for the GSSAPI pre-flight.
    curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg; \
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" > /etc/apt/sources.list.d/mongodb-org-7.0.list; \
    apt-get update; \
    apt-get install -y --no-install-recommends mongodb-mongosh; \
    rm -rf /var/lib/apt/lists/*

# yarn 1.x ships with the node image; corepack is a belt-and-suspenders fallback.
RUN corepack enable || true

COPY tests/entrypoint.sh /usr/local/bin/run-kerberos-tests.sh
RUN chmod +x /usr/local/bin/run-kerberos-tests.sh

WORKDIR /app
ENTRYPOINT ["/usr/local/bin/run-kerberos-tests.sh"]
