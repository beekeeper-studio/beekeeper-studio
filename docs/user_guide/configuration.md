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

## Configuration Files

Beekeeper Studio uses a three-tier configuration system that gives you flexible control over settings. Settings are loaded in the order below.

| Configuration | Purpose                                       | Load Order |
| ------------------- | --------------------------------------------- | ---- |
| **Default**         | Baseline settings that ship with the app      | First |
| **User**            | Your personal customizations                  | Second |
| **Administrator**   | Machine-wide settings (admin controlled)      | Third |

That means: Admin settings override user settings, user settings override default settings. IT administrators can enforce policies by providing a machine-wide Administrator configuration.

{% include-markdown '../includes/config_file_directories.md'%}


## How To Use Config Files

### Step 1: Create Your Configuration File

Decide which file to change (user or administrator). If the file doesn't exist yet, create it using any text editor. Here's a simple starter configuration. I can put this in my **User configuration**:

```ini
; My Beekeeper Studio Configuration
; Lines starting with semicolons are comments

[ui.tableTable]
pageSize = 200                          ; Show more rows per page

```

### Step 2: Save and Restart

1. Save your configuration file
2. Restart Beekeeper Studio
3. Your new settings will take effect


!!! warning "Configuration Not Working?"
    If your changes aren't taking effect:

    - **File location**: Ensure your configuration file is in the correct directory for your OS
    - **Syntax errors**: Verify INI syntax (section headers in `[brackets]`, spaces around `=`)
    - **Restart required**: Configuration changes require a complete application restart
    - **Setting names**: Check for typos in section names or setting keys
    - **File permissions**: Ensure the configuration file is readable by Beekeeper Studio
    - **Check logs**: Enable debug logging to see configuration loading details

## Configuration Reference

Below are the default configuration values for Beekeeper Studio, copy and modify as needed.
{% ini-include %}
