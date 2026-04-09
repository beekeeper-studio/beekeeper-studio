---
title: Encryption Key Security
summary: How Beekeeper Studio protects your saved database credentials using the OS keychain
icon: material/key-variant
---

## What This Means

Beekeeper Studio encrypts your saved database passwords and credentials locally on your device. Normally, the encryption key is protected by your operating system's keychain (macOS Keychain, Windows DPAPI, or Linux Secret Service).

If you see a warning in Beekeeper Studio that says **"Your saved credentials are not protected by the OS keychain"**, it means the app could not access a keychain service and is using a less secure fallback method.

## Why the Keychain Matters

Without OS keychain protection, the encryption key is stored in a file that could be read by anyone with access to your filesystem. While the key is obfuscated, it is not truly secure. With the OS keychain, only your user account can decrypt the key.

## How to Fix It

### macOS

macOS Keychain is always available. If you see this warning on macOS, please [report the issue](https://github.com/beekeeper-studio/beekeeper-studio/issues).

### Windows

Windows DPAPI is always available. If you see this warning on Windows, please [report the issue](https://github.com/beekeeper-studio/beekeeper-studio/issues).

### Linux — GNOME / Ubuntu / Fedora

`gnome-keyring` is usually installed and running by default. If not:

```bash
# Debian/Ubuntu
sudo apt install gnome-keyring

# Fedora
sudo dnf install gnome-keyring
```

Restart Beekeeper Studio after installing.

### Linux — KDE

KDE Wallet (`kwallet`) is usually running by default. If not:

```bash
# Debian/Ubuntu
sudo apt install kwalletmanager

# Fedora
sudo dnf install kwalletmanager5
```

Restart Beekeeper Studio after installing.

### Linux — i3 / sway / Hyprland / other tiling window managers

Tiling window managers don't auto-start a keyring daemon. Install `gnome-keyring` and start it in your session:

```bash
# Install
sudo apt install gnome-keyring  # or equivalent for your distro

# Add to your session startup (.xinitrc, sway config, hyprland config, etc.)
eval $(gnome-keyring-daemon --start --components=secrets)
export SSH_AUTH_SOCK
```

For **i3**, add to `~/.xinitrc` or `~/.xprofile`:
```bash
eval $(gnome-keyring-daemon --start --components=secrets)
```

For **sway**, add to `~/.config/sway/config`:
```
exec eval $(gnome-keyring-daemon --start --components=secrets)
```

Restart your session and then Beekeeper Studio.

### Linux — WSL (Windows Subsystem for Linux)

WSL does not have a native keyring. Install and start `gnome-keyring`:

```bash
sudo apt install gnome-keyring dbus-x11
eval $(dbus-launch --sh-syntax)
eval $(gnome-keyring-daemon --start --components=secrets)
```

You may need to add these lines to your shell profile (e.g., `~/.bashrc`).

## Verification

After setting up a keyring service, restart Beekeeper Studio. The warning should disappear. Your existing saved credentials will be automatically migrated to keychain-protected storage — no action needed on your part.

## Still Having Issues?

If you've set up a keyring service but still see the warning, or if you're on macOS/Windows and see the warning, please [open an issue](https://github.com/beekeeper-studio/beekeeper-studio/issues) so we can investigate.
