# Beekeeper Studio Fork - Build From Source

This is a fork of [Beekeeper Studio](https://github.com/beekeeper-studio/beekeeper-studio) that includes a convenient build script for compiling the application from source on any platform.

## What This Fork Provides

This fork includes **`build-beekeeper.sh`** (and `build-beekeeper.ps1` for Windows), a build script that automates the entire process of:

1. Setting up the correct Node.js version
2. Installing all dependencies
3. Compiling the Electron application
4. Packaging installers for your platform (DMG, EXE, DEB, AppImage, etc.)
5. Copying the final installers to `~/Downloads/beekeeper-releases/v{version}/`

## Quick Start

```bash
# Clone this repository
git clone https://github.com/Pruthvik007/beekeeper-studio.git
cd beekeeper-studio

# Run the build script
./build-beekeeper.sh
```

That's it! The script handles everything else automatically.

---

## Platform-Specific Instructions

### macOS (Apple Silicon - M1/M2/M3/M4)

#### Prerequisites

1. **Install Homebrew** (if not already installed):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install nvm** (Node Version Manager):
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
   ```
   Close and reopen your terminal after installation.

3. **Install Node.js 20**:
   ```bash
   nvm install 20
   ```

4. **Install Yarn**:
   ```bash
   npm install -g yarn
   ```

5. **Install Python setuptools**:
   ```bash
   brew install python-setuptools
   ```

#### Build

```bash
# Clone and enter the repository
git clone https://github.com/Pruthvik007/beekeeper-studio.git
cd beekeeper-studio

# Make the script executable (first time only)
chmod +x build-beekeeper.sh

# Run the build
./build-beekeeper.sh --mac
```

#### Output

After the build completes, you'll find the installers at:
```
~/Downloads/beekeeper-releases/v{version}/
├── Beekeeper-Studio-{version}-arm64.dmg      # Installer for Apple Silicon
├── Beekeeper-Studio-{version}-arm64-mac.zip  # Portable ZIP
└── *.blockmap                                 # Auto-update files
```

To install, simply open the `.dmg` file and drag Beekeeper Studio to your Applications folder.

---

### macOS (Intel)

#### Prerequisites

Same as Apple Silicon above:

1. **Install Homebrew**:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install nvm**:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
   ```

3. **Install Node.js 20**:
   ```bash
   nvm install 20
   ```

4. **Install Yarn**:
   ```bash
   npm install -g yarn
   ```

5. **Install Python setuptools**:
   ```bash
   brew install python-setuptools
   ```

#### Build

```bash
git clone https://github.com/Pruthvik007/beekeeper-studio.git
cd beekeeper-studio
chmod +x build-beekeeper.sh
./build-beekeeper.sh --mac
```

#### Output

```
~/Downloads/beekeeper-releases/v{version}/
├── Beekeeper-Studio-{version}.dmg            # Installer for Intel Mac
├── Beekeeper-Studio-{version}-mac.zip        # Portable ZIP
└── *.blockmap                                 # Auto-update files
```

---

### Windows

You have two options for building on Windows:

#### Option A: Using PowerShell (Recommended)

##### Prerequisites

1. **Install Node.js 20** from [nodejs.org](https://nodejs.org/) (LTS version)

2. **Install Yarn**:
   ```powershell
   npm install -g yarn
   ```

3. **Install Git** from [git-scm.com](https://git-scm.com/download/win)

##### Build

```powershell
# Clone the repository
git clone https://github.com/Pruthvik007/beekeeper-studio.git
cd beekeeper-studio

# Run the PowerShell build script
.\build-beekeeper.ps1
```

If you get an execution policy error, run this first:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Option B: Using Git Bash or WSL

##### Prerequisites (Git Bash)

1. **Install Node.js 20** from [nodejs.org](https://nodejs.org/)
2. **Install Yarn**: `npm install -g yarn`
3. **Install Git Bash** from [git-scm.com](https://git-scm.com/download/win)

##### Prerequisites (WSL - Windows Subsystem for Linux)

1. **Enable WSL** and install Ubuntu from Microsoft Store
2. Follow the Linux instructions below inside WSL

##### Build

```bash
git clone https://github.com/Pruthvik007/beekeeper-studio.git
cd beekeeper-studio
chmod +x build-beekeeper.sh
./build-beekeeper.sh --win
```

#### Output

```
~/Downloads/beekeeper-releases/v{version}/
├── Beekeeper-Studio-Setup-{version}.exe      # NSIS Installer
├── Beekeeper-Studio-{version}-win.zip        # Portable version
└── *.blockmap                                 # Auto-update files
```

To install, run the `.exe` installer, or extract the `.zip` for a portable version.

---

### Linux (Ubuntu/Debian)

#### Prerequisites

1. **Install nvm**:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
   source ~/.bashrc
   ```

2. **Install Node.js 20**:
   ```bash
   nvm install 20
   ```

3. **Install Yarn**:
   ```bash
   npm install -g yarn
   ```

4. **Install build dependencies**:
   ```bash
   sudo apt-get update
   sudo apt-get install -y build-essential git ruby ruby-dev rpm libfuse2
   sudo gem install fpm
   ```

#### Build

```bash
git clone https://github.com/Pruthvik007/beekeeper-studio.git
cd beekeeper-studio
chmod +x build-beekeeper.sh
./build-beekeeper.sh --linux
```

#### Output

```
~/Downloads/beekeeper-releases/v{version}/
├── Beekeeper-Studio-{version}.AppImage       # Universal Linux package
├── beekeeper-studio_{version}_amd64.deb      # Debian/Ubuntu package
├── beekeeper-studio-{version}.x86_64.rpm     # Fedora/RHEL package
├── beekeeper-studio_{version}_amd64.snap     # Snap package
└── *.blockmap                                 # Auto-update files
```

#### Install

```bash
# AppImage (any distro)
chmod +x Beekeeper-Studio-{version}.AppImage
./Beekeeper-Studio-{version}.AppImage

# Debian/Ubuntu
sudo dpkg -i beekeeper-studio_{version}_amd64.deb

# Fedora/RHEL
sudo rpm -i beekeeper-studio-{version}.x86_64.rpm

# Snap
sudo snap install beekeeper-studio_{version}_amd64.snap --dangerous
```

---

### Linux (Fedora/RHEL/CentOS)

#### Prerequisites

1. **Install nvm**:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
   source ~/.bashrc
   ```

2. **Install Node.js 20**:
   ```bash
   nvm install 20
   ```

3. **Install Yarn**:
   ```bash
   npm install -g yarn
   ```

4. **Install build dependencies**:
   ```bash
   sudo dnf groupinstall "Development Tools"
   sudo dnf install ruby ruby-devel rpm-build fuse-libs
   sudo gem install fpm
   ```

#### Build

```bash
git clone https://github.com/Pruthvik007/beekeeper-studio.git
cd beekeeper-studio
chmod +x build-beekeeper.sh
./build-beekeeper.sh --linux
```

---

### Linux (Arch Linux)

#### Prerequisites

1. **Install nvm**:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
   source ~/.bashrc
   ```

2. **Install Node.js 20**:
   ```bash
   nvm install 20
   ```

3. **Install Yarn**:
   ```bash
   npm install -g yarn
   ```

4. **Install build dependencies**:
   ```bash
   sudo pacman -S base-devel git ruby rpm-tools fuse2
   gem install fpm
   ```

#### Build

```bash
git clone https://github.com/Pruthvik007/beekeeper-studio.git
cd beekeeper-studio
chmod +x build-beekeeper.sh
./build-beekeeper.sh --linux
```

---

## Build Script Options

| Option | Description |
|--------|-------------|
| `--mac` | Build for macOS (DMG, ZIP) |
| `--linux` | Build for Linux (AppImage, DEB, RPM, Snap) |
| `--win` | Build for Windows (EXE installer, portable ZIP) |
| `--all` | Build for all platforms |
| `--sync` | Sync with upstream Beekeeper Studio repository before building |
| `--clean` | Remove node_modules and reinstall dependencies (clean build) |
| `--help` | Show help message |

### Examples

```bash
# Build for your current platform (auto-detected)
./build-beekeeper.sh

# Build for a specific platform
./build-beekeeper.sh --mac
./build-beekeeper.sh --linux
./build-beekeeper.sh --win

# Build for multiple platforms
./build-beekeeper.sh --mac --linux

# Build for all platforms
./build-beekeeper.sh --all

# Sync with upstream and do a clean build
./build-beekeeper.sh --sync --clean --mac

# Full clean build for all platforms with upstream sync
./build-beekeeper.sh --sync --clean --all
```

---

## Syncing with Upstream

To get the latest changes from the original Beekeeper Studio repository:

```bash
./build-beekeeper.sh --sync
```

This will:
1. Add the upstream remote (if not already added)
2. Fetch the latest changes
3. Merge them into your current branch

---

## Troubleshooting

### "Permission denied" when running the script

```bash
chmod +x build-beekeeper.sh
```

### "nvm: command not found"

Close and reopen your terminal after installing nvm, or run:
```bash
source ~/.bashrc   # Linux
source ~/.zshrc    # macOS with zsh
```

### Build fails with native module errors

Try a clean build:
```bash
./build-beekeeper.sh --clean
```

### "error:03000086:digital envelope routines::initialization error"

Update OpenSSL:
```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get upgrade openssl

# macOS
brew update && brew upgrade openssl

# Fedora
sudo dnf update openssl
```

### Linux: "fpm: command not found"

Install Ruby and fpm:
```bash
# Ubuntu/Debian
sudo apt-get install ruby ruby-dev
sudo gem install fpm

# Fedora
sudo dnf install ruby ruby-devel
sudo gem install fpm
```

### Windows: PowerShell execution policy error

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## Build Output Location

All build artifacts are copied to:

```
~/Downloads/beekeeper-releases/v{version}/
```

Where `{version}` is the version number from `apps/studio/package.json`.

---

## Cross-Compilation Notes

For best results, build on each target platform natively:

| Build On | Can Build For |
|----------|---------------|
| macOS | macOS ✅, Linux ⚠️ (limited), Windows ❌ |
| Linux | Linux ✅, Windows ⚠️ (requires Wine) |
| Windows | Windows ✅ |

⚠️ = May work with limitations, some package types may not be available.

---
