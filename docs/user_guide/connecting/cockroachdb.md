---
title: CockroachDB
summary: "Connect Beekeeper Studio to CockroachDB — self-hosted, Cockroach Cloud, and JWT authentication"
description: "Beekeeper Studio speaks the PostgreSQL wire protocol, so any CockroachDB cluster works out of the box. This guide covers the bits that are Cockroach-specific: Cockroach Cloud cluster IDs and JWT authentication."
icon: material/database
---

# How To Connect to CockroachDB

CockroachDB uses the PostgreSQL wire protocol, so the basics — host, port, database, user, and password — work the same way as any Postgres connection. This page covers the two Cockroach-specific options you'll find on the connection form:

1. **Cockroach Cloud Cluster ID** — used when connecting to a serverless or dedicated cluster hosted by Cockroach Labs.
2. **JWT authentication** — used to sign in with a JSON Web Token instead of a password.

## Basic Connection

Pick **CockroachDB** from the connection type dropdown and fill in host, port (`26257` by default), username, password, and database. SSL is typically required for cloud clusters; Beekeeper's default "trust the server" SSL mode works with Cockroach Cloud's certificates.

If you have a Postgres-style connection string from the Cockroach console, paste it into the URL box at the top of the form — Beekeeper will extract the cluster ID and any Cockroach-specific options automatically.

## Cockroach Cloud Cluster ID

Cockroach Cloud multi-tenant clusters require a **cluster routing ID** so the gateway knows which tenant to route your connection to. You'll find this value in the Cockroach Cloud console under **Connect** → **Parameters only** → `options`.

Paste only the ID (everything after `--cluster=`) into the **CockroachDB Cloud Cluster ID** field. Beekeeper adds the `--cluster=...` startup option for you.

## JWT Authentication

Cockroach supports signing in with a short-lived JWT instead of a password. This is the recommended flow for any cluster that has JWT auth enabled at the cluster-setting level (see the [CockroachDB JWT docs](https://www.cockroachlabs.com/docs/stable/sso-sql.html) for the server-side setup).

### Requirements

- Your Cockroach cluster has JWT authentication enabled (`server.jwt_authentication.enabled = true` and a configured JWKS).
- You have a signed JWT whose `sub` claim matches a Cockroach SQL user, with the correct `iss` and `aud` claims for your cluster.

### Using JWT Auth in Beekeeper Studio

1. On the CockroachDB connection form, open the **Authentication Method** dropdown and select **JWT**.
2. Fill in host, port, database, and username as usual. The username must match the `sub` claim on your JWT.
3. Paste your JWT into the **JWT Token** field (this is the same field as the password, relabelled).
4. Click **Connect**.

Beekeeper sends the JWT as the password and adds the `--crdb:jwt_auth_enabled=true` startup option, which tells Cockroach to validate the credential as a token rather than a password.

### Save Passwords is off by default

When JWT auth is selected, Beekeeper automatically turns off **Save Passwords** for this connection. JWTs are short-lived, so there's no point persisting them on disk — you'll paste a fresh token the next time you connect or reconnect.

If your connection drops and Beekeeper tries to reconnect, you'll see a prompt asking for a new JWT rather than failing silently.

### Whitespace is forgiven

Beekeeper strips whitespace (including newlines) from the token before sending it, so pasted tokens that wrap across lines work fine.
