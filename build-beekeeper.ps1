#===============================================================================
# Beekeeper Studio Fork - Build Script for Windows (PowerShell)
#===============================================================================
# This script builds the Beekeeper Studio fork on Windows and copies the 
# installers to ~/Downloads/beekeeper-releases/{tag}
#
# Prerequisites (one-time setup):
#   1. Install Node.js 20 from https://nodejs.org/
#   2. Install Yarn: npm install -g yarn
#   3. Install Git from https://git-scm.com/
#
# Usage:
#   .\build-beekeeper.ps1                    # Build for Windows
#   .\build-beekeeper.ps1 -Sync              # Sync with upstream first
#   .\build-beekeeper.ps1 -Clean             # Clean node_modules before build
#   .\build-beekeeper.ps1 -Sync -Clean       # Full clean build with upstream sync
#   .\build-beekeeper.ps1 -Linux             # Also build Linux (requires WSL)
#   .\build-beekeeper.ps1 -All               # Build all platforms
#===============================================================================

param(
    [switch]$Sync,
    [switch]$Clean,
    [switch]$Mac,
    [switch]$Linux,
    [switch]$Win,
    [switch]$All,
    [switch]$Help
)

# Configuration
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = $ScriptDir
$OutputBaseDir = "$env:USERPROFILE\Downloads\beekeeper-releases"
$RequiredNodeVersion = 20
$UpstreamRepo = "https://github.com/beekeeper-studio/beekeeper-studio.git"

# Colors
function Write-Step { param($Message) Write-Host "`n==> " -ForegroundColor Blue -NoNewline; Write-Host $Message -ForegroundColor Green }
function Write-SubStep { param($Message) Write-Host "    -> " -ForegroundColor Cyan -NoNewline; Write-Host $Message }
function Write-Warning { param($Message) Write-Host "Warning: " -ForegroundColor Yellow -NoNewline; Write-Host $Message }
function Write-Error { param($Message) Write-Host "Error: " -ForegroundColor Red -NoNewline; Write-Host $Message }
function Write-Success { param($Message) Write-Host "  $([char]0x2713) " -ForegroundColor Green -NoNewline; Write-Host $Message }

function Show-Help {
    Write-Host @"
Beekeeper Studio Fork - Build Script for Windows

Usage: .\build-beekeeper.ps1 [OPTIONS]

Build Options:
  -Win             Build for Windows (default)
  -Linux           Build for Linux (requires WSL or cross-compilation)
  -Mac             Build for macOS (requires cross-compilation, not recommended)
  -All             Build for all platforms

Other Options:
  -Sync            Sync with upstream repository before building
  -Clean           Remove node_modules and reinstall dependencies
  -Help            Show this help message

Examples:
  .\build-beekeeper.ps1                    # Build for Windows
  .\build-beekeeper.ps1 -Sync              # Sync with upstream, then build
  .\build-beekeeper.ps1 -Clean             # Clean build
  .\build-beekeeper.ps1 -Sync -Clean       # Full clean build with upstream sync
  .\build-beekeeper.ps1 -Win -Linux        # Build for Windows and Linux
"@
}

function Test-Prerequisites {
    Write-Step "Checking prerequisites..."

    # Check Node.js
    try {
        $nodeVersion = (node --version) -replace 'v', '' -split '\.' | Select-Object -First 1
        if ([int]$nodeVersion -ge $RequiredNodeVersion) {
            Write-Success "Node.js v$(node --version) found"
        } else {
            Write-Warning "Node.js version $RequiredNodeVersion+ recommended (found v$(node --version))"
        }
    } catch {
        Write-Error "Node.js is not installed. Please install Node.js $RequiredNodeVersion from https://nodejs.org/"
        exit 1
    }

    # Check Yarn
    try {
        $yarnVersion = yarn --version
        Write-Success "yarn $yarnVersion found"
    } catch {
        Write-Error "yarn is not installed. Please install it: npm install -g yarn"
        exit 1
    }

    # Check Git
    try {
        $gitVersion = git --version
        Write-Success "Git found"
    } catch {
        Write-Error "Git is not installed. Please install from https://git-scm.com/"
        exit 1
    }

    # Check if in git repository
    if (-not (Test-Path "$ProjectDir\.git")) {
        Write-Error "This script must be run from within the git repository"
        exit 1
    }
    Write-Success "Git repository found"

    # Check package.json
    if (-not (Test-Path "$ProjectDir\package.json")) {
        Write-Error "package.json not found. Are you in the correct directory?"
        exit 1
    }
    Write-Success "package.json found"
}

function Sync-Upstream {
    if ($Sync) {
        Write-Step "Syncing with upstream repository..."

        Set-Location $ProjectDir

        # Add upstream remote if it doesn't exist
        $remotes = git remote
        if ($remotes -notcontains 'upstream') {
            git remote add upstream $UpstreamRepo
            Write-Success "Added upstream remote"
        }

        # Get current branch
        $currentBranch = git branch --show-current

        # Fetch upstream
        git fetch upstream

        # Try to merge upstream/master or upstream/main
        $masterExists = git show-ref --verify --quiet refs/remotes/upstream/master 2>$null
        $mainExists = git show-ref --verify --quiet refs/remotes/upstream/main 2>$null

        if ($LASTEXITCODE -eq 0 -or $masterExists) {
            git merge upstream/master --no-edit
            Write-Success "Merged upstream/master into $currentBranch"
        } elseif ($mainExists) {
            git merge upstream/main --no-edit
            Write-Success "Merged upstream/main into $currentBranch"
        } else {
            Write-Warning "Could not find upstream/master or upstream/main"
        }
    }
}

function Clear-Project {
    if ($Clean) {
        Write-Step "Cleaning project..."

        Set-Location $ProjectDir

        # Remove node_modules directories
        if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
        Get-ChildItem -Path "apps" -Directory | ForEach-Object {
            $nm = Join-Path $_.FullName "node_modules"
            if (Test-Path $nm) { Remove-Item -Recurse -Force $nm }
        }
        Get-ChildItem -Path "packages" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            $nm = Join-Path $_.FullName "node_modules"
            if (Test-Path $nm) { Remove-Item -Recurse -Force $nm }
        }

        # Remove build artifacts
        $distElectron = "apps\studio\dist_electron"
        $distStudio = "apps\studio\dist"
        $distUiKit = "apps\ui-kit\dist"
        
        if (Test-Path $distElectron) { Remove-Item -Recurse -Force $distElectron }
        if (Test-Path $distStudio) { Remove-Item -Recurse -Force $distStudio }
        if (Test-Path $distUiKit) { Remove-Item -Recurse -Force $distUiKit }

        # Clear yarn cache
        yarn cache clean 2>$null

        Write-Success "Project cleaned"
    }
}

function Install-Dependencies {
    Write-Step "Installing dependencies..."

    Set-Location $ProjectDir
    yarn install

    Write-Success "Dependencies installed"
}

function Build-App {
    Write-Step "Building application..."

    Set-Location $ProjectDir

    $buildArgs = @()

    if ($script:BuildMac) {
        $buildArgs += "--mac"
        Write-SubStep "Building for macOS..."
    }

    if ($script:BuildLinux) {
        $buildArgs += "--linux"
        Write-SubStep "Building for Linux..."
    }

    if ($script:BuildWin) {
        $buildArgs += "--win"
        Write-SubStep "Building for Windows..."
    }

    if ($buildArgs.Count -gt 0) {
        $argString = $buildArgs -join " "
        Invoke-Expression "yarn run electron:build $argString"
    } else {
        yarn run electron:build
    }

    Write-Success "Build complete"
}

function Get-AppVersion {
    Set-Location "$ProjectDir\apps\studio"
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    return $packageJson.version
}

function Copy-Artifacts {
    Write-Step "Copying build artifacts..."

    $version = Get-AppVersion
    $tag = "v$version"
    $outputDir = "$OutputBaseDir\$tag"
    $distDir = "$ProjectDir\apps\studio\dist_electron"

    # Create output directory
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

    # Copy Windows artifacts
    if ($script:BuildWin) {
        Write-SubStep "Copying Windows artifacts..."

        # EXE installers
        Get-ChildItem -Path $distDir -Filter "*.exe" -ErrorAction SilentlyContinue | ForEach-Object {
            Copy-Item $_.FullName -Destination $outputDir
            Write-Host "      $([char]0x2713) $($_.Name)" -ForegroundColor Green
        }

        # MSI installers
        Get-ChildItem -Path $distDir -Filter "*.msi" -ErrorAction SilentlyContinue | ForEach-Object {
            Copy-Item $_.FullName -Destination $outputDir
            Write-Host "      $([char]0x2713) $($_.Name)" -ForegroundColor Green
        }

        # Windows ZIP (portable)
        Get-ChildItem -Path $distDir -Filter "*-win*.zip" -ErrorAction SilentlyContinue | ForEach-Object {
            Copy-Item $_.FullName -Destination $outputDir
            Write-Host "      $([char]0x2713) $($_.Name)" -ForegroundColor Green
        }
    }

    # Copy Linux artifacts
    if ($script:BuildLinux) {
        Write-SubStep "Copying Linux artifacts..."

        # AppImage
        Get-ChildItem -Path $distDir -Filter "*.AppImage" -ErrorAction SilentlyContinue | ForEach-Object {
            Copy-Item $_.FullName -Destination $outputDir
            Write-Host "      $([char]0x2713) $($_.Name)" -ForegroundColor Green
        }

        # DEB
        Get-ChildItem -Path $distDir -Filter "*.deb" -ErrorAction SilentlyContinue | ForEach-Object {
            Copy-Item $_.FullName -Destination $outputDir
            Write-Host "      $([char]0x2713) $($_.Name)" -ForegroundColor Green
        }

        # RPM
        Get-ChildItem -Path $distDir -Filter "*.rpm" -ErrorAction SilentlyContinue | ForEach-Object {
            Copy-Item $_.FullName -Destination $outputDir
            Write-Host "      $([char]0x2713) $($_.Name)" -ForegroundColor Green
        }

        # Snap
        Get-ChildItem -Path $distDir -Filter "*.snap" -ErrorAction SilentlyContinue | ForEach-Object {
            Copy-Item $_.FullName -Destination $outputDir
            Write-Host "      $([char]0x2713) $($_.Name)" -ForegroundColor Green
        }
    }

    # Copy macOS artifacts
    if ($script:BuildMac) {
        Write-SubStep "Copying macOS artifacts..."

        # DMG
        Get-ChildItem -Path $distDir -Filter "*.dmg" -ErrorAction SilentlyContinue | ForEach-Object {
            Copy-Item $_.FullName -Destination $outputDir
            Write-Host "      $([char]0x2713) $($_.Name)" -ForegroundColor Green
        }

        # Mac ZIP
        Get-ChildItem -Path $distDir -Filter "*-mac*.zip" -ErrorAction SilentlyContinue | ForEach-Object {
            Copy-Item $_.FullName -Destination $outputDir
            Write-Host "      $([char]0x2713) $($_.Name)" -ForegroundColor Green
        }
    }

    # Copy common artifacts
    Write-SubStep "Copying common artifacts..."

    # Blockmap files
    Get-ChildItem -Path $distDir -Filter "*.blockmap" -ErrorAction SilentlyContinue | ForEach-Object {
        Copy-Item $_.FullName -Destination $outputDir
        Write-Host "      $([char]0x2713) $($_.Name)" -ForegroundColor Green
    }

    # YAML files
    Get-ChildItem -Path $distDir -Filter "latest*.yml" -ErrorAction SilentlyContinue | ForEach-Object {
        Copy-Item $_.FullName -Destination $outputDir
        Write-Host "      $([char]0x2713) $($_.Name)" -ForegroundColor Green
    }

    # Print summary
    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Green
    Write-Host "  Build Complete!" -ForegroundColor Green
    Write-Host "===============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Version: $tag"
    Write-Host "  Output:  $outputDir"
    Write-Host ""
    Write-Host "  Platforms built:"
    if ($script:BuildWin) { Write-Host "    * Windows" }
    if ($script:BuildLinux) { Write-Host "    * Linux" }
    if ($script:BuildMac) { Write-Host "    * macOS" }
    Write-Host ""
    Write-Host "  Files:"
    Get-ChildItem -Path $outputDir | ForEach-Object {
        $size = "{0:N2} MB" -f ($_.Length / 1MB)
        Write-Host "    $($_.Name) ($size)"
    }
    Write-Host ""

    # Installation instructions
    if ($script:BuildWin) {
        $exeFile = Get-ChildItem -Path $outputDir -Filter "*.exe" | Select-Object -First 1
        if ($exeFile) {
            Write-Host "  To install on Windows:"
            Write-Host "    Run: $($exeFile.Name)"
            Write-Host ""
        }
    }
}

# Main execution
function Main {
    if ($Help) {
        Show-Help
        return
    }

    # Determine build targets
    $script:BuildMac = $Mac -or $All
    $script:BuildLinux = $Linux -or $All
    $script:BuildWin = $Win -or $All

    # Default to Windows if no platform specified
    if (-not $script:BuildMac -and -not $script:BuildLinux -and -not $script:BuildWin) {
        $script:BuildWin = $true
    }

    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Blue
    Write-Host "  Beekeeper Studio Fork - Build Script for Windows" -ForegroundColor Blue
    Write-Host "===============================================================" -ForegroundColor Blue
    Write-Host "  Repository: $ProjectDir"
    Write-Host -NoNewline "  Building for:"
    if ($script:BuildWin) { Write-Host -NoNewline " Windows" }
    if ($script:BuildLinux) { Write-Host -NoNewline " Linux" }
    if ($script:BuildMac) { Write-Host -NoNewline " macOS" }
    Write-Host ""

    $startTime = Get-Date

    Test-Prerequisites
    Sync-Upstream
    Clear-Project
    Install-Dependencies
    Build-App
    Copy-Artifacts

    $endTime = Get-Date
    $duration = $endTime - $startTime
    Write-Host "  Total build time: $($duration.Minutes)m $($duration.Seconds)s"
    Write-Host ""
}

# Run main
Main
