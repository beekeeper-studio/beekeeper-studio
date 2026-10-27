---
title: Plugins
summary: "Extend Beekeeper Studio with powerful plugins that add new functionality and enhance your database workflow."
icon: material/puzzle
---

# Plugins

Plugins extend Beekeeper Studio with additional functionality, bringing new tools and capabilities directly into your database workflow. Think of them as specialized add-ons that enhance what you can do with your data.

![Plugin Manager showing available plugins](../assets/images/plugin-manager-modal.png)

## What are Plugins?

Plugins are mini-applications that run inside Beekeeper Studio to provide specialized functionality. They appear as new tabs or sidebar panels, integrating seamlessly with the rest of the interface.

Each plugin operates in its own secure environment while having access to your database connections and query capabilities through a controlled interface.

## Who Can Use Plugins?

Plugins are available to **all Beekeeper Studio users**, including those using the free Community Edition.

However, some individual plugins may have their own access requirements. For example, premium plugins developed by the Beekeeper Studio team may require a paid subscription.

## Available Plugins

### AI Shell

**Requires Paid Subscription**

![AI Shell answering user's question](../assets/images/ai-shell.png)

The AI Shell plugin brings artificial intelligence directly into your database workflow. Ask questions about your data in plain English and get intelligent responses powered by AI.

The AI Shell appears as a new tab type that you can open alongside your regular query tabs, with a built-in result viewer for any queries it runs.

## Installing Plugins

1. Go to Tools > Manage Plugins
2. Find the plugin you want to install
3. Click **Install**

## Updating Plugins

Beekeeper Studio automatically checks for plugin updates everytime you start the application. When updates are available, Beekeeper Studio will automatically download and install them. Or you can disable this behaviour by:

1. Go to Tools > Manage Plugins
2. Find the plugin
3. Uncheck **Auto-update**

## Uninstalling Plugins

1. Go to Tools > Manage Plugins
2. Find the plugin
3. Click **Uninstall**

## Installing a Specific Plugin Version

Sometimes you might need a specific plugin version - maybe the latest plugin requires a newer Beekeeper Studio version than you have, you can't update the app for some reason, or you need to downgrade to an older plugin version. Here's how to manually install any plugin version:

1. **Disable auto-update first**
    - Go to Tools > Manage Plugins
    - Find the plugin you want to install a specific version of
    - Uncheck **Auto-update** (this prevents Beekeeper Studio from updating it back to the latest version)

2. **Find the plugin in Plugin Manager**
    - Go to Tools > Manage Plugins
    - Find your plugin and click the **GitHub link**

3. **Navigate to releases**
    - Go to the **Releases** page on GitHub
    - Browse available versions

4. **Check version compatibility**
    - Click on a release to see its assets
    - Look for `manifest.json` in the release notes or assets
    - Check the `minAppVersion` field to ensure compatibility with your Beekeeper Studio version
    - Note the plugin `id` from the manifest

5. **Download the plugin**
    - Download the ZIP file (e.g., `bks-ai-shell-1.2.0.zip`, not the source code archive)

6. **Install manually**
    - Navigate to your plugins directory:

        === "Linux"
            ```bash
            ~/.config/beekeeper-studio/plugins/
            ```

        === "macOS"
            ```bash
            ~/Library/Application Support/beekeeper-studio/plugins/
            ```

        === "Windows"
            ```
            %APPDATA%\beekeeper-studio\plugins\
            ```

        === "Portable"
            ```bash
            /path/to/beekeeper-studio/beekeeper-studio-data/plugins/
            ```

    - Find the existing plugin folder and delete it
    - Create a new folder with the same plugin ID
    - Extract the downloaded ZIP file contents into this new folder

7. **Restart Beekeeper Studio**

    The specific plugin version should now be installed and ready to use.

## Custom Registries

For Business users, custom registries allow you to distribute as many plugins as you'd like to your team. Once set up, any plugins in your registry will show up in the plugin browse section. Here's how you can set up a custom registry:

1. **Create your registry**
    - Create a GitHub repository. Visibility doesn't matter, if you want a private registry we can configure a GitHub token later.
    - Add a JSON file, name it what you want, we'll call it `plugins.json`
    - Add your plugins to that file, you can check out the format from our community registry [here](https://github.com/beekeeper-studio/beekeeper-studio-plugins/blob/main/community-plugins.json). Each plugin needs an `id`, `name`, `author`, `description`, and `repo`.

2. **Add the registry to the app**
!!! tip
    For fleet deployments, use the `system.config.ini` to configure this for every machine. User configs are overriden by those settings.
    - In your [config](./configuration.md) add a section for your registry
```ini
[pluginSystem.registries.custom-name] # Replace custom-name with the name of your repo, this is only used internally and must be unique
owner = owner-name # The owner of the github repo
repo = repository-name # The repository name
file = plugins.json # The name of the file you created above
```

3. **Enable custom registries**
    - In your [config](./configuration.md), make sure `pluginSystem.thirdPartyRegistriesDisabled` is `false`.
    - You can also enable this by toggling custom registries in the plugin browse section, you may have to expand the settings at the top.
    - If your registry is in a private repo, ensure you've added a GitHub token with the correct access. This also increases your rate-limit with GitHub, so if you've been having issues with that, configuring this might help
    ![Plugin manager showing enabled custom registries and a GitHub token](../assets/images/plugin-registries-enabled.png)

4. **Install your plugins**
    - You can now install plugins from your own registry! These will be marked as `Custom` in the install UI.
    ![Plugin manager showing a custom plugin in the browse section](../assets/images/plugin-custom.png)

## Feature Requests

Have ideas for new plugins or features? We'd love to hear from you:

-   Email us through the support channels
-   Join our community discussions
-   Submit feature requests on our GitHub repository

!!! tip
    Interested in developing your own plugins? Check out our [Plugin Development documentation](../plugin_development/index.md) to get started!
