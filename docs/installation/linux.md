---
title: Linux
summary: "How to install Beekeeper Studio on Linux systems"
old_url: "https://docs.beekeeperstudio.io/docs/linux"
---


There are several ways to install Beekeeper Studio on Linux systems.

Supported Architectures: x86-64 and ARM64.

<div class="alert alert-info">
  <div class="alert-title">We recommend AppImage</div>

  <div class="text-muted">We find they provide the most consistent experience across all Linux distributions.</div>
</div>

## AppImage

AppImages can be downloaded and run directly on most Linux distributions without any sort of installation. This is great if you don't have root access, but still want to use Beekeeper Studio.

The AppImage distribution of Beekeeper Studio provides automatic updates.

Download the latest AppImage [from the Beekeeper Studio homepage](https://www.beekeeperstudio.io/)

If you want to integrate the AppImage into your system shell (so it appears in your Application menu), we recommend you [install AppImageLauncher](https://github.com/TheAssassin/AppImageLauncher/releases/latest).

## Apt / DEB
A repo is provided for Debian and Ubuntu 16.04+.

```bash
# Install our GPG key
wget --quiet -O - https://deb.beekeeperstudio.io/beekeeper.key | sudo apt-key add -

# add our repo to your apt lists directory
echo "deb https://deb.beekeeperstudio.io stable main" | sudo tee /etc/apt/sources.list.d/beekeeper-studio-app.list

# Update apt and install
sudo apt update
sudo apt install beekeeper-studio

```


## Snap Store / Ubuntu Store

You can also install Beekeeper Studio through Snapcraft (also part of the Ubuntu Store). Use either the Snap Store link below, or install through the terminal.

**Please Note** Some features are unavailable in the Snap version of Beekeeper Studio due to the security model of Snap packages.
{: .alert .alert-warning}

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

