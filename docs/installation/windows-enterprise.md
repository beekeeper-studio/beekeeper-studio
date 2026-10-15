---
title: Windows Enterprise Deployment (MSI)
summary: "Deploy Beekeeper Studio to managed Windows machines with the MSI package"
---

# Windows Enterprise Deployment (MSI)

Every Windows release includes an MSI package for IT administrators. Use it to deploy Beekeeper Studio with Microsoft Intune, Configuration Manager (SCCM), Group Policy, or any other tool that installs Windows Installer packages.

The MSI is attached to each release on the [GitHub releases page](https://github.com/beekeeper-studio/beekeeper-studio/releases) as `Beekeeper-Studio-<version>.msi`.

## MSI Package vs `.exe` Installer

|                                | MSI package                                         | `.exe` installer                         |
| ------------------------------ | --------------------------------------------------- | ---------------------------------------- |
| Install location               | All users, `C:\Program Files\Beekeeper Studio`      | Current user by default, all users optional |
| Unattended install             | `msiexec /i <file>.msi /qn`                         | `<file>.exe /S`                          |
| Shortcuts                      | Start menu, all users                               | Start menu and desktop                   |
| Updates                        | Deployed by IT, users are told when one is out      | The app updates itself                   |
| Visual C++ Redistributable     | Not included, deploy it separately                  | Downloaded during install when missing   |

## Update Notifications

An MSI install never downloads or installs updates. It checks GitHub for new stable releases at startup and once a day, and when one is out it shows users a notice to contact their system administrator. To turn the notice off, set this in [`system.config.ini`](#managing-settings):

```ini
[general]
checkForUpdatesDisabled = true
```

The **Release Channel** option is hidden from the **Help** menu, so users can't opt in to beta releases.

## Prerequisite: Visual C++ Redistributable

Beekeeper Studio requires the Microsoft Visual C++ Redistributable (x64). The MSI doesn't install it, so deploy it first if your machines don't have it already:

```bat
vc_redist.x64.exe /install /quiet /norestart
```

Download the installer from [https://aka.ms/vc14/vc_redist.x64.exe](https://aka.ms/vc14/vc_redist.x64.exe).

## Install

Run from an elevated prompt, or as SYSTEM from your deployment tool:

```bat
msiexec /i "Beekeeper-Studio-6.1.5.msi" /qn /norestart /l*v "%TEMP%\beekeeper-studio-install.log"
```

`/qn` installs with no UI. Leave out `/l*v ...` if you don't need an install log.

## Upgrade

Deploy the newer MSI with the same command. Windows Installer replaces the installed version in place. Every release shares the upgrade code `{D5B3EEEB-1754-55D1-A12B-C0245BF59784}`, for tools that track products by upgrade code.

Connections, saved queries, and settings are stored per user in `%APPDATA%\beekeeper-studio` and are kept across upgrades.

Installing an older MSI over a newer one fails with *A newer version of "Beekeeper Studio" is already installed*. To downgrade, uninstall first.

## Uninstall

```bat
msiexec /x "Beekeeper-Studio-6.1.5.msi" /qn /norestart
```

Users' data in `%APPDATA%\beekeeper-studio` is left in place.

## Deployment Tools

- **Microsoft Intune**: add the MSI as a *Line-of-business app* and assign it to device groups. Intune reads the product code and version from the package.
- **Configuration Manager**: create an application with a *Windows Installer (\*.msi file)* deployment type. The MSI's product code works as the detection method.
- **Group Policy**: copy the MSI to a network share that computer accounts can read, then assign it under *Computer Configuration > Policies > Software Settings > Software installation*.

## Don't Mix With the `.exe` Installer

Uninstall copies installed with the `.exe` installer before deploying the MSI:

- An all-users `.exe` install uses the same `C:\Program Files\Beekeeper Studio` folder as the MSI.
- A per-user `.exe` install keeps updating itself and adds a second Start menu entry.

## Managing Settings

Settings in `C:\ProgramData\beekeeper-studio\system.config.ini` apply to every user on the machine and override their own settings. Deploy this file alongside the MSI with the same tool. For example, to close database connections when Windows locks or a user goes idle:

```ini
[security]
disconnectOnLock = true
disconnectOnIdle = true
idleThresholdSeconds = 900
```

See [Configuration](../user_guide/configuration.md) for every available setting.

## Using the `.exe` Installer Instead

The `.exe` installer also supports unattended installs:

```bat
Beekeeper-Studio-Setup-6.1.5.exe /S /allusers
```

It updates itself by default. To turn that off, add this to `system.config.ini`:

```ini
[general]
checkForUpdatesDisabled = true
```
