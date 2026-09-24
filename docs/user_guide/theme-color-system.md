---
title: Theme Color System
summary: "How Beekeeper Studio builds every color in the interface from a handful of seed colors, and what each of the twelve steps in a scale is for."
icon: material/palette-swatch
---

# Theme Color System

Beekeeper Studio's interface is built almost entirely from CSS custom properties. A theme does not set the color of a button or a table row directly — it sets a small number of **seed colors**, and everything else is derived from them.

This page explains that derivation. If you just want to build a theme, start with [Creating a Theme](./creating-a-theme.md) and come back here when you need to know what a particular variable means.

## The four layers

Colors move through four layers, each one built on the one above it.

| Layer | Example | Where it lives |
| ----- | ------- | -------------- |
| Seeds | `--base-blue: #0969da` | Your theme file |
| Scales | `--blue-9`, `--blue-a3` | Generated at runtime |
| Roles | `--blue-solid-bg`, `--text-muted` | `tokens/theme.scss` |
| Components | `--btn-primary-bg`, `--editor-keyword-fg` | `tokens/component.css` |

A theme normally only touches the first layer, and overrides individual entries in the last one when a specific component needs to look different.

## Seeds

A seed is one hex color. Beekeeper Studio reads these from your theme file after it loads:

```css
--background      /* the page background */
--base-gray       /* the neutral the whole UI is built from */
--base-red        --base-orange     --base-yellow
--base-green      --base-blue       --base-purple
--base-pink
```

`--background` and `--base-gray` are required — the rest are optional, and any hue you leave out simply gets no scale. Seeds may differ between light and dark mode, and usually should.

## Scales

Each seed is expanded into a **12-step scale** using the [Radix Colors](https://www.radix-ui.com/colors) algorithm. The scale is generated in the app, not written by hand, and is transposed onto your `--background` so the steps sit correctly against your actual page color.

For a seed named `blue` you get:

- `--blue-1` … `--blue-12` — solid colors
- `--blue-a1` … `--blue-a12` — the same steps as translucent colors, blended against the background
- `--blue-contrast` — the text color that reads legibly on top of step 9
- `--blue-surface` — a translucent panel fill derived from step 2

### What each step is for

The twelve steps are not a light-to-dark ramp you pick from by eye. Each step has a job, and using the wrong one is what makes an interface look off.

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

Step 9 is the one that matters most: it *is* your seed color. The other eleven are built around it. If a theme looks wrong, it is usually because a seed was chosen without considering that it has to work as a solid fill with readable text on top.

The alpha variants carry the same meanings. Prefer them whenever the color sits on top of something that isn't the page background — a row highlight over a striped table, for instance — because they blend instead of covering.

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

## Syntax categories

The SQL editor has around sixty color tokens, which is far too many to set one by one. They are grouped into eleven **categories**, and each token defaults to its category:

```css
--syntax-keyword      --syntax-string       --syntax-constant
--syntax-variable     --syntax-function     --syntax-type
--syntax-decorator    --syntax-link         --syntax-diff
--syntax-comment      --syntax-punctuation
```

Setting `--syntax-string` colors strings, escapes, regular expressions, character literals and attribute values in one line. You then override individual tokens only where your theme genuinely differs — for example, if escapes should stand out from the strings around them.

## Where it all comes from

| File | Contains |
| ---- | -------- |
| `apps/studio/public/themes/<id>.css` | Theme seeds and overrides |
| `src/assets/styles/themes/common.scss` | Step and role names, hue list, family map |
| `src/assets/styles/themes/tokens/theme.scss` | Role aliases, family mapping |
| `src/assets/styles/themes/tokens/component.css` | Every component token and its default |
| `src/assets/styles/themes/fallback.css` | Values used before a theme loads |

`component.css` is the reference worth keeping open while working on a theme — it lists every token that exists, grouped by the part of the interface it affects.
