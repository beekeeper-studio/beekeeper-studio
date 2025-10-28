---
title: Trino
summary: "Trino support is currently in early alpha"
icon: simple/trino
description: "Connect to a Trino coordinator to run queries by using Beekeeper Studio"
---

# Trino Support

Check back frequently as we are making continual updates to our Trino support.

Super excited to have Trino support here for you all. Please bear in mind that Trino is only in the early stages of implementation, but we wanted to release it to y'all for testing.

Support has been limited to basically a "read only" state since any form of writing should be done in the confines of the database itself.

## How to Connect
Connecting to a Trino database from Beekeeper Studio is straightforward. SElect Trino from the dropdown, and fill in the host, port, username, and password fields of the Trino Cluster (not any of the underlying databases), then click Connect.

### Trino Connection Details

To connect to a Trino database, you'll need the following information:

- **Host**: The IP address or hostname of your Trino server.
- **Port**: The default port is 8080, but this can be customized if your server uses a different port.
- **Username**: Your Trino username, with default being the typical default.
- **Password**: Your Trino password, if applicable.
- **Default Catalog (optional)**: The catalog you want initially connected to at startup

### Testing Your Trino Connection

Before saving your connection details, Beekeeper Studio allows you to test the connection:

1. Enter your connection details.
2. Click the *Test Connection* button.
3. If the test is successful, you’re ready to connect. Otherwise, check your details and try again.

### Saving Your Trino Connection

Once your connection details have been verified, you can choose to save them by entering a name, checking the `Save Passwords` box if desired, and then clicking save.

## Supported Features

- Table data view
- Table data sorting, filtering
- Table structure view
- Download query results as JSON, CSV, or Markdown

## Still TBD

- SSH tunneling
- Run query(s) directly to file