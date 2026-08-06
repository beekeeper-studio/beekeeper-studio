---
title: SAP HANA
summary: "Connect to an SAP HANA database with Beekeeper Studio"
description: "Connect to SAP HANA with Beekeeper Studio using password, JWT, SAML, or X.509 certificate authentication, with full TLS and SSH tunnel support."
icon: simple/sap
---

# How To Connect to SAP HANA

SAP HANA support is available in the paid editions of Beekeeper Studio. Select `SAP HANA` from the connection type dropdown, fill in your connection details, and click `Connect`.

SAP HANA support is currently **read-only**: browse your schemas, run queries, view and export data. Changing data or schema from within Beekeeper Studio is not yet available — see [Unsupported Features](#unsupported-features) for details.

## Connection Details

- **Host**: The hostname or IP address of the HANA server.
- **Port**: The SQL port of the database. For instance number `00` this is typically `30013` (SYSTEMDB) or `30015` (single-container database). Tenant databases each have their own SQL port — HANA Express tenants usually listen on `39041`.
- **Authentication Method**: See [Authentication Methods](#authentication-methods) below.
- **Default Database** (optional): The name of a tenant database. When set, the server redirects the connection to that tenant's own SQL port, so that port must also be reachable from your machine. Leave it blank to connect directly to the database that owns the port you entered — this is the common case, and the right choice when connecting through an SSH tunnel or a forwarded port.

## Authentication Methods

- **Username / Password**: Standard database credentials. Users backed by LDAP authenticate the same way — enter the LDAP username and password.
- **JWT Token**: Paste a JWT issued by an identity provider the HANA server trusts.
- **SAML Assertion**: Paste a SAML assertion issued by a trusted identity provider.
- **X.509 Certificate**: Pick a PEM file containing the client certificate chain and private key, and provide the private key password if the key is encrypted. Certificate authentication always uses an encrypted (TLS) connection.

## SSL/TLS

Enable **SSL** in the connection form to encrypt the connection. Optional extras:

- **CA Cert File**: A certificate file used to verify the server's certificate, for servers signed by a private CA.
- **Certificate / Key File**: A client certificate for mutual TLS.
- **Reject Unauthorized**: Enforces server certificate validation. Uncheck to allow self-signed certificates.

## SSH Tunnel

SSH tunneling works like it does for other databases — see [Connection Options](./connecting.md). When tunneling, leave **Default Database** blank: a tenant redirect points at a port the tunnel doesn't forward.

## Supported Features

- Browse schemas, tables, and views, including columns, indexes, triggers, primary keys, and foreign key relations
- List stored procedures and functions
- Table data view with sorting, filtering, and pagination
- SQL editor with query cancellation
- Export tables or query results to CSV, JSON, and other formats — exports stream from the server, so large tables are fine
- Read-only connection mode

## Unsupported Features

### Not supported yet

These are on the roadmap and will arrive in future releases:

- Editing table data from the table view
- Creating and altering tables, indexes, and other schema objects
- Importing data from files
- Manual transaction management (commit/rollback from the SQL editor)
- Editing table and column comments
- Creating schemas
- Kerberos authentication

### Not planned

HANA doesn't expose these through a SQL connection, so Beekeeper Studio will not support them:

- Backup and restore
- Charset and collation selection (HANA databases are Unicode-only)
- Materialized views (HANA uses calculation views, which are managed with SAP's own tooling)
