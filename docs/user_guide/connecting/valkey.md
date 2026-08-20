---
title: Valkey
summary: "Connect to a Valkey server using Beekeeper Studio, including ACL authentication and TLS"
description: Connect to Valkey with Beekeeper Studio. Supports username/password auth and TLS.
icon: material/database
---

# How To Connect To Valkey

Select `Valkey` from the connection type dropdown, fill in your connection details, and click `Connect`.

Valkey is a fork of Redis 7.2 and speaks the same protocol, so Beekeeper Studio uses the same driver for both. Either connection type will work against either server; picking `Valkey` makes the connection self-documenting and reports the Valkey version rather than the Redis version Valkey pins for compatibility.

## Valkey Connection Details

To connect to a Valkey server, you'll need the following information:

- **Host**: The IP address or hostname of your Valkey server (default: `127.0.0.1`)
- **Port**: The port your Valkey server is listening on (default: `6379`)
- **Username**: Your Valkey username (optional, used with ACLs)
- **Password**: Your Valkey password (optional)

## Username Authentication

Valkey inherits [Access Control Lists (ACLs)](https://valkey.io/topics/acl/) from Redis 6, which allow multiple users with different permissions. If your server uses ACLs, enter your username along with your password when connecting.

If your server only uses password authentication, leave the username field blank and provide just the password.

## Supported Features

- Key browsing and viewing
- Key value editing
- A command shell for Valkey commands
- TLS/SSL connections

## Version Reporting

`INFO server` on Valkey returns a `redis_version` field frozen at the version Valkey forked from (7.2.x) so that Redis clients keep working, alongside a `valkey_version` field carrying the real version. Beekeeper Studio reports `valkey_version` when it is present.
