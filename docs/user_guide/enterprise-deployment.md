---
title: Enterprise Deployment
summary: "Configure Beekeeper Studio for enterprise environments with system-wide settings, cloud workspace controls, offline licenses, and security policies."
old_url: ""
icon: material/domain
---

# Enterprise Deployment

Beekeeper Studio supports enterprise deployment scenarios with centralized configuration, security controls, and offline operation capabilities. This guide covers deployment best practices for organizations.

!!! tip "Quick Enterprise Setup"
    For immediate deployment: set `disableCloudWorkspaces = true` in system config and use offline licenses for fully local operation.

## System-Wide Configuration

Enterprise administrators can enforce policies using system-level configuration files that override user settings.

### Configuration File Locations

The system configuration file location varies by operating system:

- **Linux**: `/etc/beekeeper-studio/system.config.ini`
- **macOS**: `/Library/Application Support/beekeeper-studio/system.config.ini`  
- **Windows**: `%ProgramData%\beekeeper-studio\system.config.ini`

### Key Enterprise Settings

```ini
[general]
; Disable cloud workspace functionality entirely
disableCloudWorkspaces = true

; Control update checking frequency (milliseconds)
checkForUpdatesInterval = 86400000

[security]
; Enforce PIN protection for all database connections
lockMode = pin
minPinLength = 8

; Auto-disconnect settings for security
disconnectOnSuspend = true
disconnectOnLock = true  
disconnectOnIdle = true
idleThresholdSeconds = 1800
```

## Cloud Workspace Control

### Disabling Cloud Features

For organizations requiring fully local operation, disable cloud workspaces:

```ini
[general]
disableCloudWorkspaces = true
```

When disabled, this setting:

- **Prevents all API calls** to Beekeeper Studio's cloud servers
- **Hides cloud workspace UI** components entirely
- **Blocks workspace signin/creation** modals from opening
- **Ensures local-only operation** with no external connections

### Data Privacy Benefits

With cloud workspaces disabled:

- No connection metadata sent to external servers
- All queries and connections remain local
- No user authentication with Beekeeper Studio services
- Complete network isolation for database access

## License Management

### Offline License Activation

Enterprise customers can use offline licenses for air-gapped environments:

1. Purchase enterprise licenses from [beekeeperstudio.io](https://beekeeperstudio.io)
2. Obtain offline license keys from support
3. Install without internet connectivity
4. Enter license keys directly in the application

### Fleet License Distribution

For large deployments:

- Use system configuration to pre-configure license keys
- Deploy via group policy or configuration management
- Contact support for volume license management tools

## Auto-Update Control

Disable automatic updates for managed environments:

```ini
[general]
; Set very high interval to effectively disable
checkForUpdatesInterval = 31536000000
```

For complete control, deploy via package managers or enterprise software distribution tools.

## Network and Proxy Configuration

### Corporate Proxy Support

Beekeeper Studio respects system proxy settings. For custom configurations:

1. Configure system-wide proxy settings
2. Use SSH tunnels for database connections
3. Whitelist required domains if using web-based authentication

### Firewall Considerations

Required network access (when cloud features enabled):

- `api.beekeeperstudio.io` - License validation
- `beekeeperstudio.io` - Documentation and updates

With `disableCloudWorkspaces = true`, no external connections are required.

## Security Configuration

### Database Connection Security

```ini
[security]
; Require PIN for all database access
lockMode = pin
minPinLength = 8

; Auto-lock on system events
disconnectOnSuspend = true
disconnectOnLock = true
disconnectOnIdle = true
idleThresholdSeconds = 1800
idleCheckIntervalSeconds = 30
```

### Connection Storage

- Database credentials stored locally with AES encryption
- No credentials transmitted to external services
- SSH key management handled locally

## Fleet Deployment

### Package Managers

Install via enterprise package managers:

```bash
# Debian/Ubuntu
sudo dpkg -i beekeeper-studio.deb

# RedHat/CentOS/Fedora  
sudo rpm -i beekeeper-studio.rpm

# macOS
sudo installer -pkg beekeeper-studio.pkg -target /
```

### Configuration Management

Deploy configurations using:

- **Ansible**: Copy system config files to target locations
- **Group Policy**: Deploy Windows configurations
- **Chef/Puppet**: Manage configuration as code

Example Ansible task:

```yaml
- name: Deploy Beekeeper Studio enterprise config
  copy:
    src: system.config.ini
    dest: /etc/beekeeper-studio/system.config.ini
    owner: root
    group: root
    mode: '0644'
```

## Default Privacy and Security

By design, Beekeeper Studio prioritizes user privacy:

- **No telemetry** or usage analytics collected
- **Local-first** architecture with optional cloud sync
- **Encrypted storage** of all sensitive data
- **Minimal external connections** (only license validation by default)

With enterprise configuration, you can achieve:

- **Complete offline operation** with cloud features disabled
- **Zero external network dependencies** for daily operation
- **Full audit compliance** with local-only data handling

## Legal and Compliance

For compliance documentation and privacy policies:

- [Privacy Policy](https://beekeeperstudio.io/legal/privacy)
- [GDPR Compliance](https://beekeeperstudio.io/legal/gdpr)
- [Data Processing](https://beekeeperstudio.io/legal/subprocessors)
- [Security Overview](https://beekeeperstudio.io/legal/security)

## Support

For enterprise deployment assistance:

- Contact [enterprise@beekeeperstudio.io](mailto:enterprise@beekeeperstudio.io)
- Review our [Trust Center](https://beekeeperstudio.io/legal)
- Schedule deployment consultation calls

Enterprise customers receive priority support for configuration, security reviews, and deployment planning.