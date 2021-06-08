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

Supported Architectures: x86-64, ARM64, armv7l, and a special build for the Raspberry Pi (armhf)

### Apt / DEB

A repo is provided for Debian and Ubuntu 16.04+. To install the repo:


```bash
# Install our GPG key
wget --quiet -O - https://deb.beekeeperstudio.io/beekeeper.key | sudo apt-key add -

# add our repo to your apt lists directory
echo "deb https://deb.beekeeperstudio.io stable main" | sudo tee /etc/apt/sources.list.d/beekeeper-studio-app.list

# Update apt and install
sudo apt update
sudo apt install beekeeper-studio

```

#### Migrating from Bintray

In Febrary 2021, JFrog announced they were turning off Bintray.
If you installed Beekeeper Studio prior to that date, you'll need to upgrade your repository setting.

From release 1.9.5 our deb post-install script should do this automatically, if that didn't work for some reason do this:

1. `sudo rm /etc/apt/sources.list.d/beekeeper-studio.list`
2. Follow the install instructions above


### AppImage

AppImages can be download and run directly on most Linux distributions without any sort of installation. This is great if you don't have root access, but still want to use Beekeeper Studio.

AppImage builds are auto-updating.

Download the latest AppImage [from the Beekeeper Studio homepage](https://www.beekeeperstudio.io/)

If you want to integrate the AppImage into your system shell (so it appears in your Application menu), we recommend you [install AppImageLauncher](https://github.com/TheAssassin/AppImageLauncher/releases/latest).



### Snap Store / Ubuntu Store

You can also install Beekeeper Studio through Snapcraft (also part of the Ubuntu Store). Use either the Snap Store link below, or install through the terminal.

`snap` is pre-installed on Ubuntu 16.04+, and can be installed on [Fedora](https://snapcraft.io/docs/installing-snap-on-fedora), and [Arch](https://snapcraft.io/docs/installing-snap-on-arch-linux)

View Beekeeper in the [Snap Store](https://snapcraft.io/beekeeper-studio), or install using the terminal:

```bash
sudo snap install beekeeper-studio
```

#### Fedora and Manjaro Font Rendering Issues (Gnome 3.38)
- There are some font-rendering issues with Snaps on the latest version of Gnome. This is only really visible in the file-select screen. [Hopefully it will be fixed soon](https://forum.snapcraft.io/t/snapped-app-not-loading-fonts-on-fedora-and-arch/12484/66)


#### SSH Key Access For The Snap
Due to the Snap security model, you need to manually enable access to the .ssh directory if you want to use SSH tunneling.
Run `sudo snap connect beekeeper-studio:ssh-keys :ssh-keys`.

- **SSH Agent**: Unfortunately, Snaps have no way to access your SSH Agent, so if you need to use the SSH agent we recommend you use the `deb` or `AppImage` version of the app.

### Raspberry Pi

Beekeeper Studio supports armhf/armv7l and arm64 which means you can run Beekeeper Studio on Raspberry Pi 2B and newer.

To install Beekeeper Studio on Raspberry Pi do one of the following:

- Install [using apt](#apt-deb)
- Download the AppImage [from GitHub](https://github.com/beekeeper-studio/beekeeper-studio/releases/latest). You want the `armv7l` version or the `arm64` version if you are running a 64bit OS on your pi. (If you don't know which you are running, use `armv7l`)
- Use Snap, and simply `snap install beekeeper-studio`


#### Learning SQL on the Raspberry Pi

If you're using Raspberry Pi to learn SQL (good job!) we recommend you download the `sakila.db` file [from Github](https://github.com/ivanceras/sakila/tree/master/sqlite-sakila-db) to practice on and try to answer [these Sakila questions](https://datamastery.gitlab.io/exercises/sakila-queries.html).

## Automatic Updates

The apps for all platforms support automatic app updates, either via store updates, or through the app itself.
