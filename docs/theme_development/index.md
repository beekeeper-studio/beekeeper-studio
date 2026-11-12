---
title: Introduction
summary: "Learn how to create, distribute, and manage themes for Beekeeper Studio to change how it looks."
icon: material/palette
---

# Introduction

The Beekeeper Studio Theme System allows designers and developers to change the look of the application with CSS. Themes set a handful of colors, and Beekeeper Studio builds every other color in the interface from them.

## What Are Themes?

Themes are CSS stylesheets that recolor Beekeeper Studio. Every theme can have a light and a dark version, and the app switches between them based on the **Light**, **Dark** or **Auto** mode in the Appearance window. Themes can set a few seed colors and let the [Color System](color-system.md) generate the rest, or override the colors of individual components.

## Theme Requirements

A theme is a folder containing a manifest and a stylesheet:

```
my-first-theme/     # folder name must match the manifest id
├── manifest.json   # required: theme metadata
└── style.css       # required: the theme's colors
```

| File | Required | Description |
| ---- | -------- | ----------- |
| `manifest.json` | Yes | Lives at the root of the theme folder. Declares the theme's `id`, `name`, `author`, `description` and `version`. |
| `style.css` | Yes | The theme's colors. Light mode colors go in `.light-theme`, dark mode colors in `.dark-theme`. |

## Next Steps

- [Creating Your First Theme](creating-your-first-theme.md) - build a theme from scratch
- [Color System](color-system.md) - how seed colors become the full interface palette
- [Publishing Themes](publishing-themes.md) - share your theme with the community
