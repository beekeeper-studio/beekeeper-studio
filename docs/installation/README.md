---
title: Installation
---

Beekeeper Studio can be installed on Mac, Windows, and Linux desktops.


## Mac Installation

Download the `dmg` installer file from [our website](https://beekeeperstudio.io), then drag the Beekeeper Studio application into your application drawer.

Note that by default MacOS will prevent you from installing third-party distributed apps (through the Mac app store). To enable this, navigate to `Settings -> Security and Privacy`, and enable `App Store and Identified Developers`:

![mac-screenshot](../assets/img/mac-security.png)

## Windows Installation

Download and run the Windows installer from [our website](https://beekeeperstudio.io).


## Linux Installation

There are several ways to install Beekeeper Studio on Linux systems. We recommend installing through Apt if you are on Ubuntu due to the limitations in Snap packages.

### Apt / DEB

A repo is provided for Ubuntu 18.04+. To install the repo:

```bash
# Install our GPG key
wget --quiet -O - https://bintray.com/user/downloadSubjectPublicKey?username=bintray | sudo apt-key add -

# add our repo to your apt lists directory
echo "deb https://dl.bintray.com/beekeeper-studio/releases disco main" | sudo tee /etc/apt/sources.list.d/beekeeper-studio.list

# Update apt and install
sudo apt update
sudo apt install beekeeper-studio

```

### AppImage

AppImages can be download and run directly on most Linux distributions without any sort of installation. This is great if you don't have root access, but still want to use Beekeeper Studio.

AppImage builds are auto-updating.

Download the latest AppImage [from the Beekeeper Studio homepage](https://www.beekeeperstudio.io/)

If you want to integrate the AppImage into your system shell (so it appears in your Application menu), we recommend you [install AppImageLauncher](https://github.com/TheAssassin/AppImageLauncher/releases/latest).



### Snap Store / Ubuntu Store

The recommended way to install Beekeeper Studio on linux is through Snapcraft (also part of the Ubuntu Store). Use either the Snap Store link below, or install through the terminal.

`snap` is pre-installed on Ubuntu 16.04+, and can be installed on [Fedora](https://snapcraft.io/docs/installing-snap-on-fedora), and [Arch](https://snapcraft.io/docs/installing-snap-on-arch-linux)

View Beekeeper in the [Snap Store](https://snapcraft.io/beekeeper-studio), or install using the terminal:

```bash
sudo snap install beekeeper-studio
```

#### SSH Key Access For The Snap
Due to the Snap security model, you need to manually enable access to the .ssh directory if you want to use SSH tunneling.
Run `sudo snap connect beekeeper-studio:ssh-keys :ssh-keys`.

- **SSH Agent**: Unfortunately, Snaps have no way to access your SSH Agent, so if you need to use the SSH agent we recommend you use the `deb` or `AppImage` version of the app.


## Automatic Updates

The apps for all platforms support automatic app updates, either via store updates, or through the app itself.