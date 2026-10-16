---
title: Windows Enterprise Deployment (MSI)
summary: "Deploy Beekeeper Studio to managed Windows machines with the MSI package"
---

# Windows Enterprise Deployment (MSI)

Every Windows release includes an MSI package for IT administrators. Use it to deploy Beekeeper Studio with Microsoft Intune, Configuration Manager (SCCM), Group Policy, or any other tool that installs Windows Installer packages.

The MSI is attached to each release on the [GitHub releases page](https://github.com/beekeeper-studio/beekeeper-studio/releases) as `Beekeeper-Studio-<version>.msi` for x64 PCs, and `Beekeeper-Studio-<version>-arm64.msi` for [Windows on ARM](#windows-on-arm) PCs.

## Known Quirks { #known-quirks }

Read these before you deploy. Each one is covered in more detail below.

- **Two MSIs, one per architecture.** Deploy the x64 MSI to x64 PCs and the ARM64 MSI to Windows on ARM PCs. Assign only one of them to any device: each one replaces the other, even at the same version. See [Windows on ARM](#windows-on-arm).
- **The ARM64 MSI is labelled x64.** Intune, Configuration Manager and inventory tools list it as an x64 package, but it installs the native ARM64 app. Target ARM64 PCs with device groups or filters, not the package architecture. See [Why the ARM64 MSI Is Labelled x64](#arm64-msi-labelled-x64).
- **The x64 MSI also installs on ARM64 PCs**, where Beekeeper Studio runs under emulation. The ARM64 MSI refuses to install on x64 PCs.
- **The Visual C++ Redistributable isn't included.** Deploy the runtime that matches the MSI (x64 or ARM64) first, or the install fails with exit code `1603`. See [Prerequisite: Visual C++ Redistributable](#vc-redist).
- **No automatic updates.** An MSI install never updates itself. Deploy each new MSI; users see a notice when a release is out. See [Update Notifications](#update-notifications).
- **A new product code for every MSI.** Each MSI has its own product code, including the x64 and ARM64 MSIs of the same version. The upgrade code never changes. Detection rules based on the product code need the new code with each release.
- **Don't mix it with the `.exe` installer** on the same PC. See [Don't Mix With the `.exe` Installer](#dont-mix-exe).

## MSI Package vs `.exe` Installer

|                                | MSI package                                         | `.exe` installer                         |
| ------------------------------ | --------------------------------------------------- | ---------------------------------------- |
| Install location               | All users, `C:\Program Files\Beekeeper Studio`      | Current user by default, all users optional |
| Unattended install             | `msiexec /i <file>.msi /qn`                         | `<file>.exe /S`                          |
| Shortcuts                      | Start menu, all users                               | Start menu and desktop                   |
| Updates                        | Deployed by IT, users are told when one is out      | The app updates itself                   |
| Visual C++ Redistributable     | Required, install fails without it                  | Downloaded during install when missing   |

## Update Notifications { #update-notifications }

An MSI install never downloads or installs updates. It checks GitHub for new stable releases at startup and once a day, and when one is out it shows users a notice to contact their system administrator. To turn the notice off, set this in [`system.config.ini`](#managing-settings):

```ini
[general]
checkForUpdatesDisabled = true
```

The **Release Channel** option is hidden from the **Help** menu, so users can't opt in to beta releases.

## Prerequisite: Visual C++ Redistributable { #vc-redist }

Beekeeper Studio requires the Microsoft Visual C++ Redistributable (x64). The MSI doesn't install it, and refuses to install without it: a silent install exits with code `1603` and this message in its log:

```text
Beekeeper Studio requires the Microsoft Visual C++ Redistributable (x64). Install it from https://aka.ms/vc14/vc_redist.x64.exe, then run this installer again.
```

Deploy the runtime first. In Intune or Configuration Manager, add it as a dependency of the Beekeeper Studio app so it's installed automatically beforehand. To install it by hand:

```bat
vc_redist.x64.exe /install /quiet /norestart
```

Download the installer from [https://aka.ms/vc14/vc_redist.x64.exe](https://aka.ms/vc14/vc_redist.x64.exe).

The check looks for the registry entry the runtime's installer creates. If the runtime is on the machine but was put there some other way, skip the check:

```bat
msiexec /i "Beekeeper-Studio-6.1.5.msi" /qn SKIP_VCREDIST_CHECK=1
```

Only do this if the runtime really is installed: Beekeeper Studio's database drivers need it.

The ARM64 MSI needs the ARM64 runtime instead, from [https://aka.ms/vc14/vc_redist.arm64.exe](https://aka.ms/vc14/vc_redist.arm64.exe), and refuses to install without it with this message:

```text
Beekeeper Studio requires the Microsoft Visual C++ Redistributable (ARM64). Install it from https://aka.ms/vc14/vc_redist.arm64.exe, then run this installer again.
```

`SKIP_VCREDIST_CHECK=1` works the same way for it.

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

## Windows on ARM (ARM64) { #windows-on-arm }

Deploy `Beekeeper-Studio-<version>-arm64.msi` to Windows on ARM PCs. It installs the native ARM64 version of Beekeeper Studio with the same commands and properties as the x64 MSI, and needs the [ARM64 Visual C++ runtime](#vc-redist).

It only installs on ARM64 PCs. On an x64 PC it fails with exit code `1603` and this message:

```text
This installer is for Windows on ARM (ARM64) PCs. Use the x64 Beekeeper Studio MSI on this PC.
```

A few database features work differently on ARM64. See [Windows on ARM](./windows.md#windows-on-arm).

### Why the ARM64 MSI Is Labelled x64 { #arm64-msi-labelled-x64 }

Beekeeper Studio's installers are built with electron-builder, and the WiX Toolset version it bundles can't create ARM64 packages ([electron-builder#6077](https://github.com/electron-userland/electron-builder/issues/6077)). So the ARM64 MSI is an x64 package that contains the ARM64 app:

- The package's platform (its `Template` summary property) is `x64;1033`. Intune, Configuration Manager and inventory tools that read it list the package as x64.
- The app it installs is native ARM64, in the same `C:\Program Files\Beekeeper Studio` folder as the x64 MSI. The **Architecture** column in Task Manager's **Details** tab shows `ARM64` for it.
- The installer's own checks look at the PC, not the package: it refuses x64 PCs, and checks for the ARM64 runtime.

Target the ARM64 MSI with device groups, assignment filters or requirement rules that select ARM64 PCs. Don't rely on the package architecture.

### Moving PCs From the x64 MSI to ARM64 { #move-to-arm64 }

The x64 MSI has no architecture check, so it also installs on ARM64 PCs, where Beekeeper Studio runs under emulation. Both MSIs share the upgrade code, and each one replaces the other, even at the same version. So:

- Assign only one MSI to each device. If a device gets both, each install removes the other, and a tool that enforces both assignments keeps reinstalling them.
- To move an ARM64 PC to the native version, take it out of the x64 MSI's assignment (an exclusion group works), then assign it the ARM64 MSI. The ARM64 MSI replaces the x64 install in place, and users' data in `%APPDATA%\beekeeper-studio` is kept.

## Uninstall

```bat
msiexec /x "Beekeeper-Studio-6.1.5.msi" /qn /norestart
```

Users' data in `%APPDATA%\beekeeper-studio` is left in place.

## Deployment Tools

Add the x64 and ARM64 MSIs as separate apps, or deployment types, and target each one at its own PCs. See [Windows on ARM](#windows-on-arm).

- **Microsoft Intune**: add the MSI as a *Line-of-business app* and assign it to device groups. Intune reads the product code and version from the package.
- **Configuration Manager**: create an application with a *Windows Installer (\*.msi file)* deployment type. The MSI's product code works as the detection method.
- **Group Policy**: copy the MSI to a network share that computer accounts can read, then assign it under *Computer Configuration > Policies > Software Settings > Software installation*.

## Don't Mix With the `.exe` Installer { #dont-mix-exe }

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
