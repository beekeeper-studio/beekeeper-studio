---
title: Linux
summary: "How to install Beekeeper Studio on Linux systems"
old_url: "https://docs.beekeeperstudio.io/docs/linux"
---


There are several ways to install Beekeeper Studio on Linux systems.

Supported Architectures: `x86-64` (most laptops and desktops) and `ARM64` (Raspberry Pi).

!!! info "We recommend using AppImage"
    We find they provide the most consistent experience across all Linux distributions.

## AppImage

!!! info "Ubuntu requires Fuse Libraries"
    In Ubuntu you will need to install libfuse for the AppImage to work. Here's how:
    Ubuntu < 22.04 use: `sudo apt-get install fuse libfuse2`
    Ubuntu >= 22.04 use: `sudo apt install libfuse2`

AppImages can be downloaded and run directly on most Linux distributions without any sort of installation. This is great if you don't have root access, but still want to use Beekeeper Studio.

The AppImage distribution of Beekeeper Studio provides automatic updates.

Download the latest AppImage [from the Beekeeper Studio homepage](https://www.beekeeperstudio.io/)

If you want to integrate the AppImage into your system shell (so it appears in your Application menu), we recommend you [install AppImageLauncher](https://github.com/TheAssassin/AppImageLauncher/releases/latest).

## DEB
A repo is provided for Debian and Ubuntu 22.04+.

DEB builds are provided for both x86_64 and ARM64 systems.

Either set the repo up using the code below, or [download the deb file from the latest release](https://github.com/beekeeper-studio/beekeeper-studio/releases/latest), and it will automatically install the repository on installation.

```bash
# Install our GPG key
curl -fsSL https://deb.beekeeperstudio.io/beekeeper.key | sudo gpg --dearmor --output /usr/share/keyrings/beekeeper.gpg \
  && sudo chmod go+r /usr/share/keyrings/beekeeper.gpg \
  && echo "deb [signed-by=/usr/share/keyrings/beekeeper.gpg] https://deb.beekeeperstudio.io stable main" \
  | sudo tee /etc/apt/sources.list.d/beekeeper-studio-app.list > /dev/null

# Update apt and install
sudo apt update && sudo apt install beekeeper-studio -y
```

## RPM

RPM builds are provided for both x86_64 and ARM64 systems

Either set the repo up using the code below, or [download the rpm file from the latest release](https://github.com/beekeeper-studio/beekeeper-studio/releases/latest), and it will automatically install the repository on installation.

```bash
# Download a copy of our .repo file (to handle software updates)
sudo curl -o /etc/yum.repos.d/beekeeper-studio.repo https://rpm.beekeeperstudio.io/beekeeper-studio.repo


# Add our GPG public key
sudo rpm --import https://rpm.beekeeperstudio.io/beekeeper.key

# check if the repo is configured correctly
dnf repolist

# Then
sudo dnf install beekeeper-studio
# or, on legacy systems
sudo yum install beekeeper-studio
```

## Arch Linux (and derivatives)

Pacman (installed as local packages using `pacman -U`) packages are provided for both x86_64 and ARM64 systems, you can download them from [the latest release](https://github.com/beekeeper-studio/beekeeper-studio).

Real AUR integration coming soon.

## Flatpak

Flatpak (.flatpak) files are provided separately for both x86_64 and ARM64 systems, you can download them from [the latest release](https://github.com/beekeeper-studio/beekeeper-studio).

Flathub integration coming soon.

## Snap

You can also install Beekeeper Studio through Snapcraft (also part of the Ubuntu Store). Use either the Snap Store link below, or install through the terminal.

!!! warning
    Some features are unavailable in the Snap version of Beekeeper Studio due to the security model of Snap packages.

`snap` is pre-installed on Ubuntu 16.04+, and can be installed on [Fedora](https://snapcraft.io/docs/installing-snap-on-fedora), and [Arch](https://snapcraft.io/docs/installing-snap-on-arch-linux)

View Beekeeper in the [Snap Store](https://snapcraft.io/beekeeper-studio), or install using the terminal:

```bash
sudo snap install beekeeper-studio
```

### Font Rendering Issues

There are some font-rendering issues with Snaps on the latest version of Gnome with the `snap` version of Beekeeper Studio. This is only really visible in the file-select screen. [Hopefully it will be fixed soon](https://forum.snapcraft.io/t/snapped-app-not-loading-fonts-on-fedora-and-arch/12484/66)

If you see something like this, we recommend you move to the [AppImage](#appimage) version instead.



![Image Alt Tag](../assets/images/linux-4.png)
Font rendering issues in Gnome 3.38+ with the snap package
{: .text-muted .small .text-center }


### SSH Key Access For The Snap
Due to the Snap security model, you need to manually enable access to the .ssh directory if you want to use SSH tunneling.
Run `sudo snap connect beekeeper-studio:ssh-keys :ssh-keys`.

- **SSH Agent**: Unfortunately, Snaps have no way to access your SSH Agent, so if you need to use the SSH agent we recommend you use the `deb` or `AppImage` version of the app.

## Wayland support (including fractional scaling)

Beekeeper Studio fully supports Wayland (tested on Gnome only) with fractional scaling too.

If you are experiencing a blurry app UI using Wayland mode and fractional scaling -- enable native wayland mode below.

However Wayland native mode is not enabled by default due to the issues with Nvidia drivers and wayland renderers (womp womp).

To enable wayland native mode create a `~/.config/bks-flags.conf` file. This idea is copied from the [AUR implementation of code-flags for VSCode in the visual-studio-code-bin wrapper](https://aur.archlinux.org/cgit/aur.git/commit/?h=visual-studio-code-bin&id=a0595836467bb205fcabb7e6d44ad7da82b29ed2).


### Enabling Wayland support

1. Create ~/.config/bks-flags.conf
2. Add flags to enable wayland support

```bash
# create the file
touch ~/.config/bks-flags.conf
```

```bash
# add the flags
echo "--ozone-platform-hint=auto" >> ~/.config/bks-flags.conf
echo "--enable-features=UseOzonePlatform" >> ~/.config/bks-flags.conf
```

### Fixing weird colors on Wayland

If you experience incorrect colors when using Wayland (e.g. oranges appearing yellow, greys looking almost black, overly bright whites, or poor text readability), this is caused by a [Chromium/Electron bug with the Wayland color management protocol](https://github.com/electron/electron/issues/49566).

To fix this, add the following flag to your `~/.config/bks-flags.conf` file:

```bash
echo "--disable-features=WaylandWpColorManagerV1" >> ~/.config/bks-flags.conf
```

Then restart Beekeeper Studio for the change to take effect.
