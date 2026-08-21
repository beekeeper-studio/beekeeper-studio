---
title: Snowflake
summary: "Connect to a Snowflake instance using Beekeeper Studio"
description: Connect to Snowflake with Beekeeper Studio.
icon: simple/snowflake
---

# How to Connect to Snowflake
Connecting to your Snowflake instance is straightforward. Select `Snowflake` from the connection type dropdown, fill in your connection details, and click `Connect`.

## Snowflake Connection Details

To connect to a Snowflake instance, you'll need the following information:

- **Account ID**: Your account identifier. This can be found in Snowflake under the "Connect a tool to Snowflake" option. It is formatted as <org_name>-<account_name>
- **Username**: Your Snowflake Database username
- **Password**: Your Snowflake Database password
- **Default Database**: The Database you want to connect to be default
- **Default Warehouse**: The Warehouse you want to use by default

## MFA Authentication

Beekeeper supports connecting to Snowflake with Multi-Factor Authentication, both with Duo SEcurity and with an Authenticator app. All you need to do is select the desired method in the Authentication Method dropdown.

If you select "Multi-Factor Authentication with Code", Beekeeper will prompt you for the Authenticator passcode before connecting.

If you select "Multi-Factor Authentication with Duo", you will receive a notification from Duo on your device to authenticate when you attempt to connect.

## Authentication Token Caching

The Snowflake driver can cache Authentication Tokens locally for a limited amount of time to reduce the number of prompts required for authentication. This requires your Account to allow client token caching:

### Caching For MFA
Run this query:
```snowflake
ALTER ACCOUNT SET ALLOW_CLIENT_MFA_CACHING = TRUE;
```

### Caching For SSO
Run this query:
```
ALTER ACCOUNT SET ALLOW_ID_TOKEN = TRUE;

```
