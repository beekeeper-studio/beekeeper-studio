---
title: Theme Color System
summary: "How Beekeeper Studio builds every color in the interface from a handful of seed colors, and what each of the twelve steps in a scale is for."
icon: material/palette-swatch
---

# Theme Color System

Beekeeper Studio's interface is built almost entirely from CSS custom properties. By default, every color is derived from a small number of **seed colors**. You can still set the color of a specific component when you need to.

This keeps a theme consistent without much effort: every part of the interface draws from the same scales. It also makes recoloring easy: set `--base-accent` and everything that uses the primary color follows it.

This page explains that derivation. If you just want to build a theme, start with [Creating a Theme](./creating-a-theme.md) and come back here when you need to know what a particular variable means.

## The four layers

Colors move through four layers, each one built on the one above it.

| Layer           | Example                                         | Where it lives                                       |
|-----------------|-------------------------------------------------|------------------------------------------------------|
| Seeds           | `--base-blue`                                   | Your theme file                                      |
| Steps           | `--blue-1`, `--blue-2`, `--blue-3`, ...         | Generated at runtime                                 |
| Aliases         | `--blue-solid-bg`, `--blue-solid-contrast`, ... | `apps/studio/src/assets/styles/tokens/aliases.scss`  |
| Components      | `--btn-bg`, `--sidebar-bg`, ...                 | `apps/studio/src/assets/styles/tokens/component.css` |

### Seeds

Beekeeper Studio reads these from your theme file after it loads:

```css
--background      /* the page background */
--base-gray       /* the neutral the whole UI is built from */
--base-red        --base-orange     --base-yellow
--base-green      --base-blue       --base-purple
--base-pink
--base-accent     /* optional — drives the primary family */
```

`--background` is required  — the rest are optional. `--base-accent` is not a hue of its own; it generates the `primary` scale (see [Semantic families](#semantic-families)). Seeds may differ between light and dark mode, and usually should.

### Steps

Each seed is expanded into a **12-step scale** using the [Radix Colors](https://www.radix-ui.com/colors) algorithm. The scale is generated in the app, not written by hand, and is transposed onto your `--background` so the steps sit correctly against your actual page color.

For a seed named `blue` you get:

- `--blue-1` … `--blue-12` — solid colors
- `--blue-a1` … `--blue-a12` — the same steps as translucent colors, blended against the background
- `--blue-contrast` — the text color that reads legibly on top of step 9
- `--blue-surface` — a translucent panel fill derived from step 2

#### Use cases

Each step is designed to be used in a particular way, following [Radix's use cases](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale#use-cases).

| Step | Role name | Use it for |
| ---- | --------- | ---------- |
| 1 | `bg-base` | App background |
| 2 | `bg-subtle` | Subtle background — sidebars, striped rows |
| 3 | `bg` | Component background at rest |
| 4 | `bg-hover` | Component background, hovered |
| 5 | `bg-active` | Component background, pressed or selected |
| 6 | `border-subtle` | Borders on non-interactive elements |
| 7 | `border` | Borders on interactive elements |
| 8 | `border-hover` | Borders hovered, and focus rings |
| 9 | `solid-bg` | Solid fills — primary buttons, badges. This is the seed color itself |
| 10 | `solid-bg-hover` | Solid fills, hovered |
| 11 | `text` | Low-contrast text |
| 12 | `text-contrast` | High-contrast text |

Step 9 is the seed color. The other eleven are built around it.

### Role aliases

Every step is also available by its role name, which is usually easier to read:

```css
--blue-9            /* same thing */
--blue-solid-bg     /* same thing */
```

Gray is special: because it's the neutral the whole interface is built from, its roles have **no prefix**.

```css
--bg-base           /* = --gray-1 */
--text              /* = --gray-11 */
--text-contrast     /* = --gray-12 */
--border-subtle     /* = --gray-6 */
```

Two extra aliases exist for convenience: `--border-color` (same as `--border-subtle`) and `--text-muted` (`--gray-10`).

Please find all aliases in `apps/studio/src/assets/styles/tokens/aliases.scss`.

### Components

Component tokens are what the interface actually should use. Each one points at a step or alias:

```css
--btn-primary-bg: var(--primary-solid-bg);
--btn-flat-bg: var(--gray-a3);
--sidebar-bg: var(--gray-2);
```

Please find all component tokens in `apps/studio/src/assets/styles/tokens/component.css`.

## Semantic families

Five **families** give a hue a meaning, so components can ask for "the danger color" rather than "red":

| Family | Hue |
| ------ | --- |
| `primary` | gray, or `--base-accent` when the theme sets one |
| `info` | blue |
| `success` | green |
| `warning` | orange |
| `danger` | red |

Families expose the same steps and roles as a hue — `--primary-9`, `--danger-text`, `--info-bg-hover` — plus `--<family>-contrast` for text on step 9.

Component tokens are written against families, not hues. That is why a danger button follows your red seed without anything naming red.

`primary` is the exception. It falls back to gray, but a theme can point it anywhere by setting `--base-accent`, which is generated into the `primary` scale directly:

```css
--base-accent: #0969da;   /* primary now follows blue */
```

The other four families are fixed to their hue. A theme that needs a different one overrides the component tokens that use it.

## Syntax highlighting

Text editor colors are grouped into eleven **categories**.

```css
--syntax-keyword      --syntax-string       --syntax-constant
--syntax-variable     --syntax-function     --syntax-type
--syntax-decorator    --syntax-link         --syntax-diff
--syntax-comment      --syntax-punctuation
```

Each category colors a group of more specific `--editor-*-fg` tokens. Please find all of them in [`component.css`](https://github.com/beekeeper-studio/beekeeper-studio/blob/master/apps/studio/src/assets/styles/tokens/component.css).
