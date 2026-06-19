---
title: Redis
summary: "Connect to a Redis database using Beekeeper Studio with optional username authentication and ReJSON support"
description: Connect to Redis with Beekeeper Studio. Supports username/password auth, TLS, and the ReJSON module.
icon: simple/redis
---

# How To Connect To Redis

Connecting to a Redis instance is straightforward. Select `Redis` from the connection type dropdown, fill in your connection details, and click `Connect`.

## Redis Connection Details

To connect to a Redis instance, you'll need the following information:

- **Host**: The IP address or hostname of your Redis server (default: `127.0.0.1`)
- **Port**: The port your Redis server is listening on (default: `6379`)
- **Username**: Your Redis username (optional, supported in Redis 6+ with ACLs)
- **Password**: Your Redis password (optional)

## Username Authentication

Redis 6 introduced [Access Control Lists (ACLs)](https://redis.io/docs/management/security/acl/), which allow you to create multiple users with different permissions. If your Redis server uses ACLs, enter your username along with your password when connecting.

For older Redis versions that only use password authentication, leave the username field blank and provide just your password.

## Supported Features

- Key browsing and viewing
- Key value editing
- AI Shell for Redis commands
- ReJSON module support for viewing and editing JSON documents stored in Redis
- SSH tunneling
- TLS/SSL connections

## ReJSON Support

If your Redis server has the [ReJSON module](https://redis.io/docs/stack/json/) installed, Beekeeper Studio can display and edit JSON values stored with `JSON.SET`. JSON data will be rendered with syntax highlighting in the value viewer.
