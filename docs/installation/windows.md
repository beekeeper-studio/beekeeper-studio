---
title: Windows
summary: "How to install Beekeeper Studio on Windows"
old_url: "https://docs.beekeeperstudio.io/docs/windows"
---

## Simply Download And Run


Download and run the Windows installer from [our website](https://beekeeperstudio.io).

Beekeeper Studio is available for both Windows architectures:

- **x64**: PCs with an Intel or AMD processor.
- **ARM64**: Windows on ARM PCs, such as those with a Snapdragon X processor.

The download page picks the right version for your PC. If you're not sure which one you have, open **Settings → System → About** and look at **System type**: it reads either `x64-based processor` or `ARM-based processor`.


## Portable Version of Beekeeper Studio

We also have a portable version of Beekeeper Studio that does not require installation. This is also available from our website, for both x64 and ARM64.


## Enterprise Deployment (MSI)

IT administrators can deploy Beekeeper Studio with the MSI package, using Intune, Configuration Manager, Group Policy, or a silent `msiexec` install. See [Windows Enterprise Deployment (MSI)](./windows-enterprise.md).


## Windows on ARM (ARM64) { #windows-on-arm }

The ARM64 version runs natively on Windows on ARM, so it's faster and uses less battery than the x64 version running under emulation. It updates itself the same way the x64 version does.

If you already run the x64 version on an ARM PC, download the ARM64 installer and run it. It installs over the x64 version and keeps your connections, saved queries, and settings. The x64 version doesn't switch itself to ARM64 when it updates, but when it runs on an ARM PC it shows a notice with a link to the ARM64 version.

The ARM64 installer only runs on ARM PCs. On an x64 PC it stops with a message pointing you to the x64 installer.

### Database limitations on ARM64

Some database drivers rely on native libraries that their vendors don't publish for Windows on ARM. On the ARM64 version:

- **LibSQL** connections are not supported. The `libsql` driver has no Windows ARM64 build. Use the x64 version of Beekeeper Studio if you need LibSQL.
- **Oracle** connects in [thin mode](../user_guide/connecting/oracle-database.md) only. Oracle doesn't make an Instant Client for Windows on ARM, so thick mode features such as Native Network Encryption are unavailable.
- **MongoDB** client-side field level encryption (CSFLE) and Queryable Encryption are unavailable. They need the `mongodb-client-encryption` library, which MongoDB doesn't publish for Windows ARM64. See [MongoDB](../user_guide/connecting/mongodb.md#windows-on-arm).
- **SQL Anywhere** needs SAP's SQL Anywhere client libraries (`dbcapi.dll`), which SAP doesn't publish for Windows on ARM.
- **SQL Server** integrated authentication (**Kerberos / Windows (via ODBC)**) needs the ARM64 build of [Microsoft ODBC Driver 18 for SQL Server](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server). ODBC Driver 17 has no ARM64 build. SQL Login, Domain (NTLM), and Azure / Entra ID authentication need nothing extra.

Every other database works the same as on x64.
