---
title: SQL Server
summary: "Connect to Microsoft SQL Server, including integrated Windows / Kerberos authentication."
description: "Beekeeper Studio connects to SQL Server with SQL logins, Azure authentication, and integrated Windows / Kerberos (SSPI) authentication. This guide covers the prerequisites for passwordless integrated authentication on Windows, Linux, and macOS."
icon: material/database
---

# How To Connect to SQL Server

Beekeeper Studio supports several ways to authenticate to Microsoft SQL Server.
Pick the one that matches how your server is set up:

### SQL Login

A **username and password** managed by SQL Server itself. This is the default and
works everywhere with **no extra setup** — no system packages, no Kerberos ticket.
Choose this if your DBA gave you a SQL Server login, or for local/development
instances using `sa`.

### Domain (NTLM)

Enter a **username, password, and Domain** on the connection form. This performs
password-based **NTLM** authentication against a Windows domain account. It is
distinct from integrated authentication: you still supply credentials, and it needs
none of the system prerequisites below.

### Windows / Kerberos (Integrated)

**Passwordless** authentication using the identity of the currently logged-in OS
user (SSPI). The username and password fields are hidden — the connection uses your
current OS session. This mode is the only one that requires the
[system prerequisites](#prerequisites-for-integrated-authentication) described below.

### Azure Active Directory / Entra ID

Sign in with an Azure / Entra ID identity (interactive browser, Azure CLI, service
principal, and more). This is configured separately — see
[Azure / Entra ID](azure-entraid.md) — and does **not** need the integrated-auth
prerequisites.

!!! info "Enterprise feature"
    Integrated Windows / Kerberos authentication is part of the paid Enterprise
    Authentication feature set. SQL Login and Domain (NTLM) are available in all
    editions.

## Kerberos vs NTLM

"Integrated Authentication" (SSPI) is an umbrella over two wire protocols. The same
connection — no username, no password — negotiates one of:

- **Kerberos**: used when the host is domain-joined, a matching **SPN** is registered
  for the SQL Server, and a Key Distribution Center (KDC / domain controller) is
  reachable. This normally requires connecting by **hostname or FQDN** (not `localhost`
  or an IP).
- **NTLM**: the fallback used for standalone/workgroup machines, `localhost`
  connections, or when the Kerberos prerequisites are not met.

Beekeeper Studio uses the same code path for both; the host environment determines
which protocol is negotiated.

## Prerequisites for integrated authentication

!!! warning "These apply only to Windows / Kerberos (Integrated) mode"
    SQL Login, Domain (NTLM), and Azure / Entra ID need **none** of the packages
    below. Only the passwordless **Windows / Kerberos (Integrated)** mode relies on a
    system ODBC driver and a Kerberos client.

### Windows

Usually nothing extra is required. Windows ships an ODBC driver and SSPI support, so
selecting **Windows / Kerberos (Integrated)** and connecting by hostname/FQDN works
out of the box on a domain-joined machine.

If connections fail, install the latest
[Microsoft ODBC Driver 18 for SQL Server](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server).

### Linux

Integrated authentication on Linux requires the following host packages — they are
**not** bundled with Beekeeper Studio because they register system-wide and depend on
your distribution's libraries:

1. **unixODBC** — the ODBC driver manager.
2. **Microsoft ODBC Driver 18 for SQL Server** (`msodbcsql18`). Follow Microsoft's
   [install guide](https://learn.microsoft.com/en-us/sql/connect/odbc/linux-mac/installing-the-microsoft-odbc-driver-for-sql-server).
3. **Kerberos client** (`krb5-user` on Debian/Ubuntu, `krb5-workstation` on
   RHEL/Fedora) with a valid `/etc/krb5.conf` pointing at your realm/KDC.

```bash
# Debian / Ubuntu
sudo apt-get install unixodbc krb5-user

# RHEL / Fedora
sudo dnf install unixODBC krb5-workstation
```

Then obtain a Kerberos ticket for your domain user before connecting:

```bash
kinit user@YOUR.REALM
klist   # confirm a valid ticket exists
```

!!! note "Clock sync"
    Kerberos rejects tickets when the client and KDC clocks differ by more than a few
    minutes. Keep the machine time-synced (e.g. with `chrony` or `ntpd`).

### macOS

macOS support is best-effort. Install **unixODBC** and the **Microsoft ODBC Driver 18**
(both available via [Homebrew](https://brew.sh) per Microsoft's
[macOS guide](https://learn.microsoft.com/en-us/sql/connect/odbc/linux-mac/install-microsoft-odbc-driver-sql-server-macos)),
and obtain a Kerberos ticket with `kinit` as on Linux.

## Connecting

1. Add a new SQL Server connection.
2. Set **Authentication** to **Windows / Kerberos (Integrated)**. The username and
   password fields are hidden — authentication uses your current OS identity.
3. Enter the server **hostname or FQDN** (use the fully qualified name so Kerberos can
   match the SPN) and port.
4. Connect.

## Troubleshooting

- **"Integrated authentication requires ... ODBC Driver 18 for SQL Server"** — the ODBC
  driver (and unixODBC on Linux/macOS) is not installed. See the prerequisites above.
- **The connection times out during login** — TCP reached the server but the
  SSPI/Kerberos handshake did not complete. Check the SQL Server's **SPN registration**
  and that the client can reach a domain controller. Confirm you have a valid ticket
  with `klist`.
- **Verify which protocol was negotiated** — once connected, run:

    ```sql
    SELECT auth_scheme FROM sys.dm_exec_connections WHERE session_id = @@SPID;
    ```

    `KERBEROS` confirms Kerberos; `NTLM` means it fell back (commonly because you
    connected by `localhost`/IP or no matching SPN exists).
- **Confirm the authenticated principal**:

    ```sql
    SELECT SUSER_SNAME();
    ```
