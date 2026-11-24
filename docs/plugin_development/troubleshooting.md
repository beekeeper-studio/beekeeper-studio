---
title: Troubleshooting
summary: "Troubleshooting issues with your plugins and themes"
---

!!! info Terms
    On this page, we refer to plugins and themes collectively as "extensions"

## What to do if your extension isn't loading
- Does your extension have a manifest?
- Is your manifest valid? Check out the manifest schema for the [Plugin System](./manifest.md) or the [Theme System](../theme_development/manifest.md)
- Does your extension id match the name of the directory it is in? If the id and directory name don't match, Beekeeper wont load the extension.
- Are unlisted plugins or themes enabled?

## How to get logs for troubleshooting
- Run the app in [debug mode](../support/troubleshooting.md/#debugging-ref)
- Look for logs referencing the id in your manifest. For instance `Manifest id "my-cool-theme" does not match expected id "theme"`
