---
title: Color System
summary: "How Beekeeper Studio builds every color in the interface from a handful of seed colors, and what each of the twelve steps in a scale is for."
icon: material/palette-swatch
---

# Color System

A color system keeps UI colors structured, consistent and accessible. Beekeeper Studio uses [Radix Colors](https://www.radix-ui.com/colors) algorithm to generate colors.

## How Colors Work

Every color in the interface travels through four layers:

| Layer | Example |
| ----- | ------- |
| Seeds | `--base-blue` |
| Primitives | `--blue-1`, `--blue-2`, `--blue-3`, ... |
| Semantics | `--blue-solid-bg`, `--blue-text`, ... |
| Components | `--btn-bg`, `--sidebar-bg`, ... |

Here's a breakdown of each layer:

### 1. Seeds

Seeds are the colors you set in your theme. Beekeeper Studio reads them when your theme loads:

```css
--background      /* the page background */
--base-gray       /* the neutral the whole UI is built from */
--base-accent     /* drives the primary family */

--base-red        --base-orange     --base-yellow
--base-green      --base-blue       --base-purple
--base-pink
```

Every seed is optional:

- `--background` defaults to `white` in light mode and `#121212` in dark mode.
- `--base-accent` isn't a hue of its own. It generates the `primary` scale (see [Semantic Families](#semantic-families)).
- Seeds usually differ between light and dark mode.

See the default seeds in [`default/style.css`](https://github.com/beekeeper-studio/beekeeper-studio/blob/master/apps/studio/public/themes/default/style.css).

### 2. Primitives

Each seed is expanded into a **12-step scale**. The scale is generated in the app, and is adjusted to your `--background`.

For a seed named `blue`, you get:

| Token | Description |
| ----- | ----------- |
| `--blue-1` … `--blue-12` | Solid colors |
| `--blue-a1` … `--blue-a12` | The same steps as translucent colors, blended against the background |
| `--blue-contrast` | Text color that's legible on top of step 9 |
| `--blue-surface` | Translucent panel fill, based on step 2 |

These are raw colors, with no meaning attached yet.

!!! note
    Step 9 is the seed color itself. The other eleven steps are built around it.

### 3. Semantics

Each step is meant for a specific job, following [Radix's use cases](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale#use-cases):

| Step | Role | Example use cases |
| ---- | --------- | ---------- |
| 1 | `bg-base` | App background |
| 2 | `bg-subtle` | Subtle backgrounds, such as sidebars and striped rows |
| 3 | `bg` | Component background |
| 4 | `bg-hover` | Component background, hovered |
| 5 | `bg-active` | Component background, pressed or selected |
| 6 | `border-subtle` | Borders on non-interactive elements |
| 7 | `border` | Borders on interactive elements |
| 8 | `border-hover` | Borders, hovered, and focus rings |
| 9 | `solid-bg` | Solid fills, such as primary buttons and badges |
| 10 | `solid-bg-hover` | Solid fills, hovered |
| 11 | `text` | Low-contrast text |
| 12 | `text-contrast` | High-contrast text |

Every step is also available by its role name. For example:

```css
--blue-solid-bg     /* = --blue-9   */
--yellow-border     /* = --yellow-7 */
```

Gray is the neutral color, so its semantic names have no prefix:

```css
--bg-base           /* = --gray-1  */
--border-subtle     /* = --gray-6  */
--text              /* = --gray-11 */
--text-contrast     /* = --gray-12 */
```

See every semantic token in [`semantics.scss`](https://github.com/beekeeper-studio/beekeeper-studio/blob/master/apps/studio/src/assets/styles/tokens/semantics.scss).

### 4. Components

Component tokens are the top layer. They name a color by where it's used, like `--sidebar-bg`, and each one points at a primitive or a semantic token:

```css
--btn-primary-bg: var(--primary-solid-bg);
--btn-flat-bg: var(--gray-a3);
--sidebar-bg: var(--gray-2);
```

See every component token in [`component.css`](https://github.com/beekeeper-studio/beekeeper-studio/blob/master/apps/studio/src/assets/styles/tokens/component.css).

## Semantic Families

Families give a hue a meaning, so components can ask for "the danger color" instead of "red".

| Family | Hue |
| ------ | --- |
| `primary` | Gray, or `--base-accent` if your theme sets one |
| `info` | Blue |
| `success` | Green |
| `warning` | Orange |
| `danger` | Red |

Families have the same steps and role names as a hue, such as `--primary-9`, `--danger-text` and `--info-bg-hover`, plus `--<family>-contrast` for text on step 9.

Component tokens use families, not hues. That's why a danger button follows your `--base-red` without anything naming red.

`primary` works a little differently. It falls back to gray, but you can point it at any color by setting `--base-accent`:

```css
--base-accent: #0969da;   /* primary is now blue */
```

The other four families always follow their hue. To change one, override the component tokens that use it.

## Syntax Highlighting

Editor colors are grouped into eleven **categories**:

```css
--syntax-keyword      --syntax-string       --syntax-constant
--syntax-variable     --syntax-function     --syntax-type
--syntax-decorator    --syntax-link         --syntax-diff
--syntax-comment      --syntax-punctuation
```

Each category colors a group of more specific `--editor-*-fg` tokens, such as `--editor-keyword-fg` or `--editor-number-fg`. Set a category to recolor the whole group, or set an `--editor-*-fg` token to change just one.

See every editor token in [`component.css`](https://github.com/beekeeper-studio/beekeeper-studio/blob/master/apps/studio/src/assets/styles/tokens/component.css).
