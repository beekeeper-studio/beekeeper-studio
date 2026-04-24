---
title: GreengageDB
summary: "Connect Beekeeper Studio to GreengageDB (PostgreSQL-compatible) — self-hosted and Docker"
description: "GreengageDB is PostgreSQL-compatible, so connecting from Beekeeper Studio is very similar to Postgres. This guide covers Greengage-specific notes and common settings, including Greengage 6 and 7."
icon: material/database
---

# How To Connect to GreengageDB

GreengageDB is **PostgreSQL-compatible** (it speaks the PostgreSQL wire protocol), so the basics — host, port, database, user, password, SSL, and SSH tunneling — work the same way as a Postgres connection.

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

## GreengageDB docs

To learn more about GreengageDB and how to set up your environment (including Docker), see the official documentation:

[GreengageDB documentation](https://greengagedb.org/en/docs-gg/current/intro.html)

## GreengageDB 6 vs 7

Beekeeper Studio supports both **GreengageDB 6** and **GreengageDB 7**.

### GreengageDB 6 (PostgreSQL 9.4–compatible)

GreengageDB 6 is based on an older PostgreSQL version, so some newer PostgreSQL features are not available.

Known example:
- **GENERATED columns** (PostgreSQL 12+) are not supported.

### GreengageDB 7

GreengageDB 7 is generally recommended when you have a choice.

