# Themes

A theme is a folder in here named after its theme id, with one file per color
scale (`gray.css`, `yellow.css`, `blue.css`, ...) holding both its light and
dark blocks, and an `editor.css` for the syntax highlighting colors.
`index.css` imports them all, holds anything that is not a scale, and is what
`app.scss` pulls in, so adding a theme is: create the folder, add it to
`app.scss`, register the id in `ThemeModule`.

## Rules

**A theme must define at least the light color scales.** The dark scales are
optional; without them a theme looks the same in both modes.

**Light scales go on `.theme-<id>`. Dark scales go on `.theme-<id>.dark-theme`.**

```css
.theme-solarized {
  --gray-1: #fcfcfc;
  --gray-2: #f9f9f9;
  /* ... */
}

.theme-solarized.dark-theme {
  --gray-1: #090909;
  /* ... */
}
```

Both classes land on the same element (`body` for the app, or any element that
wants its own theme scope, like the previews in the appearance modal). Keep the
dark block on that same element rather than a descendant: the semantic tokens
in `utilities.scss` are resolved on the element that carries the theme classes,
so a scale set further down the tree is never seen by them.

**Color scales are `--gray-1` … `--gray-12`, `--primary-1` … `--primary-12`,
and so on**, plus the `-a` alpha variants (`--gray-a1` … `--gray-a12`). They
follow the
[Radix scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale):
1–2 backgrounds, 3–5 component states, 6–8 borders, 9 the purest color, 10 its
hover, 11 low-contrast text, 12 high-contrast text.

## How far to go

In a perfect case, replacing the scales is all a theme does.

If you want more than the scales give you, read `utilities.scss`. It maps the
scales to semantic names (`--text`, `--bg-subtle`, `--border`), then those to
component names (`--btn-flat-bg`, `--sidebar-bg`, `--menu-bg`). Override
whichever of those you need — the more specific the variable you override, the
smaller the blast radius.

Overriding by id, class name, or any selector other than a CSS variable is the
last option.
