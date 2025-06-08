---
title: Configuration
summary: "Customize Beekeeper Studio's behavior with INI configuration files - adjust shortcuts, timeouts, security settings, and more."
old_url: ""
icon: material/cog
---

# Configuration

Beekeeper Studio uses an `ini` configuration system that lets you customize the app to match your workflow and preferences. Using simple INI configuration files, you can adjust everything from keyboard shortcuts and database connection timeouts to security settings like PIN protection.

!!! tip "Quick Start"
    New to configuration? Jump to the [Getting Started section](#getting-started-with-configuration) for a simple walkthrough, or check out our [example configurations](#example-configurations) to see common customizations.

## How Configuration Works

Beekeeper Studio uses a three-tier configuration system that gives you flexible control over settings:

| Configuration Level | File Location                              | Purpose                                       |
| ------------------- | ------------------------------------------ | --------------------------------------------- |
| **Default**         | `default.config.ini` (bundled)             | Baseline settings that ship with the app      |
| **User**            | [Your app data directory](#file-locations) | Your personal customizations                  |
| **Administrator**          | [System-wide directory](#file-locations)   | Organization-wide settings (admin controlled) |

### File Locations

#### User Configuration (`user.config.ini`)

This is where you make your personal customizations:

-   **macOS**: `~/Library/Application Support/beekeeper-studio/user.config.ini`
-   **Linux**: `~/.config/beekeeper-studio/user.config.ini`
-   **Windows**: `%APPDATA%/beekeeper-studio/user.config.ini`

#### Administrator Configuration (`system.config.ini`)

Administrators can use this for organization-wide settings:

-   **macOS**: `/Library/Application Support/beekeeper-studio/system.config.ini`
-   **Linux**: `/etc/beekeeper-studio/system.config.ini`
-   **Windows**: `C:\ProgramData\beekeeper-studio\system.config.ini`

#### Development Configuration (`local.config.ini`)

For developers and testing (place in project root directory)

### Config Loading Order

Beekeeper Studio loads configuration files in this priority order.

1. **Default configuration** (baseline settings)
2. **User configuration** (your personal overrides)
3. **Administrator configuration** (admin overrides - highest priority)

!!! note "Loading precedence"
    Admin settings override user settings, user settings override default settings. IT administrators can enforce policies by setting the `system.config.ini` file, which will override any user customizations.

## Getting Started with Configuration


### Step 1: Create Your Configuration File

Decide which file to change (user or administrator). If the file doesn't exist yet, create it using any text editor. Here's a simple starter configuration:

```ini
; My Beekeeper Studio Configuration
; Lines starting with semicolons are comments

[ui.tableTable]
pageSize = 200                          ; Show more rows per page

[keybindings.general]
openQuickSearch = ctrlOrCmd+shift+p     ; Custom shortcut for quick search

[security]
disconnectOnLock = true                 ; Disconnect when system locks
```

### Step 2: Save and Restart

1. Save your configuration file
2. Restart Beekeeper Studio completely
3. Your new settings will take effect immediately

### Step 3: Verify Your Changes

Test that your configuration is working:

- **Page size**: Open any table and verify more rows are displayed per page
- **Quick search**: Try your new keyboard shortcut (`Ctrl/Cmd+Shift+P`)
- **Security**: Lock your system to test auto-disconnect behavior

!!! success "Configuration Applied!"
    If your changes are working, congratulations! You've successfully customized Beekeeper Studio. Browse the sections below to discover more customization options.

!!! warning "Configuration Not Working?"
    If your changes aren't taking effect:

    - **File location**: Ensure your configuration file is in the correct directory for your OS
    - **Syntax errors**: Verify INI syntax (section headers in `[brackets]`, no spaces around `=`)
    - **Restart required**: Configuration changes require a complete application restart
    - **Setting names**: Check for typos in section names or setting keys
    - **File permissions**: Ensure the configuration file is readable by Beekeeper Studio
    - **Check logs**: Enable debug logging to see configuration loading details

## Configuration Options

### General Settings

Control application-wide behavior like update checks and data synchronization:

```ini
[general]
checkForUpdatesInterval = 86400000      ; Check for updates every 24 hours (in milliseconds)
dataSyncInterval = 30000                ; Sync data every 30 seconds
workspaceSyncInterval = 5000            ; Sync workspace every 5 seconds
```

!!! info "Sync Intervals"
    Lower sync intervals provide more real-time updates but use more system resources. For team environments with [cloud storage](cloud-storage-team-workspaces.md), consider longer intervals to reduce network traffic.

### Security Settings

When connecting to a database, Beekeeper Studio can prompt you for a PIN/password. Combined with the auto-disconnect options below, this allows you to further secure your connections and data.

```ini
[security]
disconnectOnSuspend = true              ; Disconnect when system goes to sleep
disconnectOnLock = true                 ; Disconnect when system is locked (win/mac only)
disconnectOnIdle = true                 ; Disconnect when user is idle (win/mac only)
lockMode = disabled                     ; Options: disabled, pin (on connecting to a database)
idleThresholdSeconds = 300              ; Idle timeout (5 minutes)
idleCheckIntervalSeconds = 30           ; How often to check for idle state
minPinLength = 6                        ; Minimum PIN length when using PIN mode
```

**Lock Mode Options:**

-   `disabled` - No additional protection (default)
-   `pin` - Require PIN entry to connect to a database

!!! warning "Security Note"
    If you forget your PIN, there is no recovery option. You'll need to disable PIN mode in your configuration file and restart the application. Consider using a password manager to store your PIN securely.

### Forgot PIN {#forgot-pin}

If you forget your PIN and cannot connect to any databases, you can reset the application by deleting the application data directory:

!!! danger "Data Loss Warning"
    This will remove ALL your saved connections, queries, settings, and PIN. Only use this if you cannot remember your PIN.

#### Reset Steps

1. **Close Beekeeper Studio completely**

2. **Delete the application data directory**:
   - **Windows**: `%APPDATA%\beekeeper-studio\`
   - **macOS**: `~/Library/Application Support/beekeeper-studio/`
   - **Linux**: `~/.config/beekeeper-studio/`

3. **Restart Beekeeper Studio** - it will start fresh with default settings

### Recommendations for IT Administrators

The best way to enforce PIN protection is to deploy an administrator configuration file (`system.config.ini`) with the following steps:

1. Create an ini file
2. enable `lockMode = pin`.
3. Enable all 3 auto-disconnect options with reasonable timeouts
4. Deploy this config file to the 'administrator configuration' location for your OS (see above)

This forces all users to set a PIN on first load of the app, requires pin entry when connecting to a database, and disconnects users when their system is locked, suspended, or idle.


### User Interface Settings

Customize the interface to match your workflow and screen setup.

#### General Interface

```ini
[ui.general]
binaryEncoding = hex                    ; Display binary data as 'hex' or 'base64'
```

#### Layout & Sizing

```ini
[ui.layout]
mainContentMinWidth = 200               ; Main content area minimum width
primarySidebarMinWidth = 150            ; Primary sidebar minimum width
secondarySidebarMinWidth = 150          ; Secondary sidebar minimum width

[ui.tableList]
itemHeight = 22.8                       ; Table list item height (pixels)
```

#### Query Editor

```ini
[ui.queryEditor]
maxResults = 50000                      ; Maximum results to display
```

#### Table View

```ini
[ui.tableTable]
pageSize = 100                          ; Rows displayed per page
defaultColumnWidth = 125                ; Default column width
minColumnWidth = 100                    ; Minimum column width
maxColumnWidth = 1000                   ; Maximum column width
maxInitialWidth = 500                   ; Maximum initial column width
largeFieldWidth = 300                   ; Width for large text fields
```

#### Specialized Views

```ini
[ui.tableTriggers]
maxColumnWidth = 300                    ; Triggers view column width limit

[ui.export]
errorNoticeTimeout = 60000              ; Export error notice duration (60 seconds)
```

### Database Connection Settings

Fine-tune connection behavior for different database types. These settings are especially useful for slow networks or heavily loaded servers.

#### MySQL & MariaDB

```ini
[db.mysql]
connectTimeout = 3600000                ; Connection timeout (1 hour)

[db.mariadb]
connectTimeout = 3600000                ; Connection timeout (1 hour)
```

#### PostgreSQL-Compatible Databases

These databases use connection pooling for efficient resource management:

```ini
[db.postgres]
connectionTimeout = 15000               ; Connection timeout (15 seconds)
idleTimeout = 20000                     ; Idle connection timeout (20 seconds)
maxClient = 5                           ; Maximum pool connections

[db.cockroachdb]
connectionTimeout = 15000               ; Connection timeout (15 seconds)
idleTimeout = 20000                     ; Idle connection timeout (20 seconds)
maxClient = 5                           ; Maximum pool connections

[db.redshift]
connectionTimeout = 15000               ; Connection timeout (15 seconds)
idleTimeout = 20000                     ; Idle connection timeout (20 seconds)
maxClient = 5                           ; Maximum pool connections
```

### Keyboard Shortcuts

Customize keyboard shortcuts to match your workflow. Especially useful when migrating from other database tools.

!!! tip "Multiple Shortcuts"
    You can assign multiple keyboard shortcuts to the same action using array notation with `[]`. This is perfect for accommodating different user preferences or migrating from other database tools.

#### General Actions

```ini
[keybindings.general]
refresh[] = f5                          ; Multiple shortcuts for same action
refresh[] = ctrlOrCmd+r                 ; (use array notation)
addRow = ctrlOrCmd+n                    ; Add new row
save = ctrlOrCmd+s                      ; Save changes
openInSqlEditor = ctrlOrCmd+shift+s     ; Open in SQL editor
openQuickSearch = ctrlOrCmd+p           ; Open quick search
copySelection = ctrlOrCmd+c             ; Copy selection
pasteSelection = ctrlOrCmd+v            ; Paste selection
cloneSelection = ctrlOrCmd+d            ; Clone selection
deleteSelection = delete                ; Delete selection
```

#### Tab Management

```ini
[keybindings.tab]
closeTab = ctrlOrCmd+w                  ; Close current tab
nextTab[] = ctrl+tab                    ; Switch to next tab
nextTab[] = ctrlOrCmd+pagedown
previousTab[] = ctrl+shift+tab          ; Switch to previous tab
previousTab[] = ctrlOrCmd+pageup
reopenLastClosedTab = ctrlOrCmd+shift+t ; Reopen last closed tab
switchTab1 = alt+1                      ; Switch to specific tabs (1-9)
switchTab2 = alt+2
; ... continues up to switchTab9 = alt+9
```

#### Quick Search

Jump quickly to any table, view, or saved query:

```ini
[keybindings.quickSearch]
focusSearch[] = ctrlOrCmd+k             ; Focus search box
focusSearch[] = ctrlOrCmd+o
close = esc                             ; Close quick search
selectUp[] = up                         ; Navigate up
selectUp[] = ctrlOrCmd+p
selectDown[] = down                     ; Navigate down
selectDown[] = ctrlOrCmd+n
open = enter                            ; Open selected item
altOpen = ctrlOrCmd+enter              ; Alternative open action
openInBackground = right                ; Open in background
altOpenInBackground = ctrlOrCmd+right   ; Alternative background open
```

#### Query Editor

```ini
[keybindings.queryEditor]
selectEditor = ctrlOrCmd+l              ; Select all editor content
submitQueryToFile = ctrlOrCmd+i         ; Export query results to file
submitCurrentQueryToFile = ctrlOrCmd+shift+i ; Export current query to file
selectNextResult = shift+up             ; Navigate through results
selectPreviousResult = shift+down
copyResultSelection = ctrlOrCmd+c       ; Copy selected results
switchPaneFocus = ctrlOrCmd+`          ; Switch between editor and results
```

#### Table View

```ini
[keybindings.tableTable]
nextPage = ctrlOrCmd+right              ; Next page of results
previousPage = ctrlOrCmd+left           ; Previous page of results
focusOnFilterInput = ctrlOrCmd+f        ; Focus on filter input
openEditorModal = shift+enter           ; Open cell editor modal
```

#### Modifier Keys

Available modifier keys for keyboard shortcuts:

| Modifier    | Description                                              |
| ----------- | -------------------------------------------------------- |
| `ctrl`      | Control key                                              |
| `cmd`       | Command key (macOS only)                                 |
| `ctrlOrCmd` | Control on Windows/Linux, Command on macOS (recommended) |
| `shift`     | Shift key                                                |
| `alt`       | Alt/Option key                                           |
| `meta`      | Meta/Windows key                                         |

!!! tip "Cross-Platform Shortcuts"
    Use `ctrlOrCmd` for shortcuts that should work consistently across all operating systems.

## Example Configurations

### Basic User Configuration

Here's a sample `user.config.ini` file with common customizations:

```ini
; Beekeeper Studio User Configuration
; Comments start with semicolons

[ui.tableTable]
pageSize = 200                          ; Show more rows per page
defaultColumnWidth = 150                ; Wider default columns

[ui.queryEditor]
maxResults = 100000                     ; Display more query results

[security]
lockMode = pin                          ; Enable PIN protection
minPinLength = 8                        ; Require 8-character PIN
disconnectOnLock = true                 ; Disconnect when system locks

[db.postgres]
connectionTimeout = 30000               ; Longer timeout for slow networks

[keybindings.general]
openQuickSearch = ctrlOrCmd+shift+p     ; Custom quick search shortcut
```

### Developer-Focused Configuration

Configuration for developers working with large datasets and multiple databases:

```ini
; Developer Configuration

[ui.tableTable]
pageSize = 500                          ; Handle large datasets
maxColumnWidth = 400                    ; See more content per column

[ui.queryEditor]
maxResults = 500000                     ; Large result sets

[db.postgres]
connectionTimeout = 60000               ; Handle slow dev/staging servers
maxClient = 10                          ; More concurrent connections

[db.mysql]
connectTimeout = 60000                  ; Extended timeout for dev work

[keybindings.general]
refresh[] = f5
refresh[] = ctrlOrCmd+r                 ; Multiple refresh options
save = ctrlOrCmd+s                      ; Quick save

[keybindings.queryEditor]
selectEditor = ctrlOrCmd+a              ; Select all query text
switchPaneFocus = ctrlOrCmd+tab         ; Quick pane switching
```

### Enterprise/Team Configuration

System configuration for team environments with security requirements:

```ini
; Enterprise Configuration (system.config.ini)

[security]
lockMode = pin                          ; Enforce PIN protection
minPinLength = 8                        ; Minimum security requirement
disconnectOnLock = true                 ; Secure on system lock
disconnectOnSuspend = true              ; Secure on suspend
disconnectOnIdle = true                 ; Auto-disconnect idle users
idleThresholdSeconds = 900              ; 15-minute idle timeout

[general]
checkForUpdatesInterval = 604800000     ; Check weekly instead of daily

[ui.queryEditor]
maxResults = 10000                      ; Limit result sets for performance

; Standardize keyboard shortcuts across team
[keybindings.general]
openQuickSearch = ctrlOrCmd+p           ; Consistent shortcuts
save = ctrlOrCmd+s

[keybindings.tab]
closeTab = ctrlOrCmd+w
nextTab = ctrlOrCmd+tab
```

### Getting Help

If you're still experiencing issues:

1. **Enable debug logging** in Beekeeper Studio to see detailed configuration loading information
2. **Check the [troubleshooting guide](../support/troubleshooting.md)** for additional solutions
3. **Contact support** through the [support channels](../support/contact-support.md) with your configuration file and error details
4. **Community help** - Ask questions in the [GitHub repository](https://github.com/beekeeper-studio/beekeeper-studio) or community forums

!!! tip "Related Documentation"
    - [Connecting to databases](connecting/connecting.md) - Learn about connection options and security
    - [Cloud storage and team workspaces](cloud-storage-team-workspaces.md) - Share configurations across your team
    - [Privacy mode](privacy-mode.md) - Additional privacy and security features
    - [Troubleshooting](../support/troubleshooting.md) - General troubleshooting guidance
