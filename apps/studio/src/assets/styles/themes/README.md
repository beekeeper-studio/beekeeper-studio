# Themes

A theme is one CSS file in this folder, named after its theme id. It is loaded
at runtime as `app://themes/<id>.css`, so it is not imported anywhere — adding
the file and registering the id in `ThemeModule` is enough.

`beekeeper-studio.css` is the exception: it is the base theme and ships in the
app bundle via `app.scss`.

## Rules

**A theme must define at least the light color scales.** The dark scales are
optional; without them a theme looks the same in both modes.

**Light scales go on `:root, .light-theme`. Dark scales go on `.dark-theme`.**

```css
:root,
.light-theme {
  --gray-1: #fcfcfc;
  --gray-2: #f9f9f9;
  /* ... */
}

.dark-theme {
  --gray-1: #090909;
  /* ... */
}
```

Light needs both selectors: `:root` so the values are there before a theme
class is applied, and `.light-theme` so they win over another theme's `:root`
block.

**Color scales are `--gray-1` … `--gray-12`, `--primary-1` … `--primary-12`,
and so on**, plus the `-a` alpha variants (`--gray-a1` … `--gray-a12`). The
families in use are `gray`, `primary`, `danger`, `info`, `success` and
`warning`. They follow the
[Radix scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale):
1–2 backgrounds, 3–5 component states, 6–8 borders, 9 the purest color, 10 its
hover, 11 low-contrast text, 12 high-contrast text.

## How far to go

In a perfect case, replacing the scales is all a theme does. `solarized.css` is
the example to follow — it defines its own ramp and maps `--gray-*` onto it.

If you want more than the scales give you, read `utilities.css`. It maps the
scales to semantic names (`--text`, `--bg-subtle`, `--border`), then those to
component names (`--btn-flat-bg`, `--sidebar-bg`, `--menu-bg`). Override
whichever of those you need — the more specific the variable you override, the
smaller the blast radius.

Overriding by id, class name, or any selector other than a CSS variable is the
last option. It ties the theme to markup that will move.
