---
title: GreengageDB
summary: "Connect Beekeeper Studio to GreengageDB (PostgreSQL-compatible) — self-hosted and Docker"
description: "GreengageDB is PostgreSQL-compatible, so connecting from Beekeeper Studio is very similar to Postgres. This guide covers Greengage-specific notes and common settings, including Greengage 6 and 7."
icon: material/database
---

# How To Connect to GreengageDB

GreengageDB is **PostgreSQL-compatible** (it speaks the PostgreSQL wire protocol), so the basics — host, port, database, user, password, SSL, and SSH tunneling — work the same way as a Postgres connection.

In Beekeeper Studio, GreengageDB uses the same connection form as PostgreSQL.

## Basic connection

1. Create a new connection in Beekeeper Studio.
2. Select **GreengageDB** from the database type dropdown.
3. Fill in:
    - **Host**
    - **Port**
    - **Database**
    - **User**
    - **Password**
4. (Optional) Configure **SSL/TLS** and/or **SSH Tunnel**.
5. Click **Test Connection**, then **Connect**.

## Docker quick start (for local testing)

If you're running GreengageDB via Docker, you can use the official images and connect from Beekeeper Studio after the cluster finishes initializing.

### GreengageDB 7

- Host: `localhost`
- Port: `5439`
- Database: `postgres`
- User: `gpadmin`
- Password: empty (common when the container is configured with `trust`), or use the image's default if it requires one

### GreengageDB 6

- Host: `localhost`
- Port: `5438`
- Database: `postgres`
- User: `gpadmin`
- Password: empty (common when the container is configured with `trust`), or use the image's default if it requires one

For Docker-specific details, see the GreengageDB docs:
https://greengagedb.org/en/docs-gg/current/use_docker.html

## GreengageDB 6 vs 7

Beekeeper Studio supports both **GreengageDB 6** and **GreengageDB 7**.

### GreengageDB 6 (PostgreSQL 9.4–compatible)

GreengageDB 6 is based on an older PostgreSQL version, so some newer PostgreSQL features are not available.

Known example:
- **GENERATED columns** (PostgreSQL 12+) are not supported.

### GreengageDB 7

GreengageDB 7 is generally recommended when you have a choice.

## Troubleshooting

### Connection works from `psql` but fails in Beekeeper

- Verify **host/port** and any **SSL mode**.
- For Docker, confirm the container allows external connections (for PostgreSQL-compatible servers this is commonly controlled by `pg_hba.conf` and `listen_addresses`).

### “Connection terminated unexpectedly”

This typically indicates a server-side disconnect (restart/crash/resource pressure). Check the GreengageDB server logs and ensure the server has enough CPU/RAM, especially when running inside Docker.

