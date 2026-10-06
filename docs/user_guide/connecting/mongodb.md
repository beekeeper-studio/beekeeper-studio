---
title: MongoDB
summary: "Connect to MongoDB with Beekeeper Studio"
icon: simple/mongodb
description: "Use a MongoDB shell or SQL editor to run queries against MongoDB by using Beekeeper Studio"
---

# MongoDB Support

## Supported Features

- Table data view
- Table data sorting, filtering
- Table structure view
- Entity sidebar
- Editing data
- Running queries in some sort of REPL
- Writing SQL against Mongo
- Import/Export
- Backup/Restore
- Schema editing
- Read only mode


## Still TBD

- SSH tunneling

## Kerberos (GSSAPI) Authentication

!!! note "Enterprise feature"
    Kerberos authentication requires a Beekeeper Studio Enterprise license.

Beekeeper Studio connects to MongoDB with a connection URL, and Kerberos auth is
configured entirely through that URL using the `GSSAPI` auth mechanism:

```
mongodb://user%40REALM.EXAMPLE.COM@host.example.com/?authMechanism=GSSAPI&authMechanismProperties=SERVICE_NAME:mongodb
```

- The principal goes in the userinfo part of the URL. URL-encode the `@` between the
  user and the realm as `%40` (e.g. `user@REALM` becomes `user%40REALM`).
- `authMechanismProperties` is a comma-separated list of `KEY:VALUE` pairs. Common keys:
    - `SERVICE_NAME` — the service principal name, defaults to `mongodb`.
    - `SERVICE_REALM` — the realm of the service, when it differs from the user's realm.
    - `CANONICALIZE_HOST_NAME` — `none`, `forward`, or `forwardAndReverse`.

### Prerequisites

- The krb5 client libraries must be installed on the machine running Beekeeper Studio.
  On Linux/macOS that means a working krb5 client and a valid `/etc/krb5.conf`.
- Obtain a ticket with `kinit` before connecting.
- The server must have a registered SPN (`mongodb/<fqdn>`). Connect by the server's
  fully-qualified domain name so the SPN matches.
- The client clock must be in sync with the KDC.

### SSH tunnels

Kerberos relies on the server's hostname to match the SPN. An SSH tunnel rewrites the
host the driver connects to, which breaks SPN matching — connect directly to the
FQDN rather than tunnelling when using Kerberos.