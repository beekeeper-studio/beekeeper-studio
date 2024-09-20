---
title: Firebird
summary: "How to connect to Firebird 3+ from Beekeeper Studio with Legacy Authentication"
---

Beekeeper Studio doesn't support the firebird 3+ wire protocol yet, so your firebird server needs to allow legacy connections.

!!! Warning
    If security is a concern, you should not use the Legacy_Auth authentication plugin. The legacy connection method sends passwords over the wire unencrypted, does not support wire protocol encryption, and also limits (truncates!) the usable length of the password to 8 bytes.


## Locate Firebird.conf

`firebird.conf` is usually located at the installation directory of your firebird server. It may vary per distribution but typically looks like this:

| OS             | Default Path                                       |
|----------------|----------------------------------------------------|
| Linux or MacOS | /opt/firebird/firebird.conf                        |
| Windows        | %ProgramFiles%\Firebird\Firebird_5_0\firebird.conf |


## Setting up legacy client authentication

To setup legacy authentication in Firebird 3, you need to add the following in `firebird.conf`:

```
AuthServer = Srp, Legacy_Auth
WireCrypt = Enabled # or Disabled
UserManager = Legacy_UserManager
```

To setup legacy authentication in Firebird 4+, you need to add the following in `firebird.conf`:

```
AuthServer = Srp256, Srp, Legacy_Auth
WireCrypt = Enabled # or Disabled
UserManager = Legacy_UserManager
```


