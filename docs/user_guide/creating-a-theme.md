---
title: Creating a Theme
summary: "Build a custom color theme for Beekeeper Studio with a single CSS file and as little as one color."
icon: material/palette
---

# Creating a Theme

A Beekeeper Studio theme is a single CSS file. At minimum it sets one color, and the app derives the rest of the interface from it.

## 1. The theme file

Create a CSS file in `apps/studio/public/themes/`. The filename is the theme id:

```
apps/studio/public/themes/midnight.css
```

Register it so it appears in the appearance picker, in `apps/studio/src/store/modules/ThemeModule.ts`:

```ts
themes: [
  { id: "default", label: "Beekeeper Studio" },
  // …
  { id: "midnight", label: "Midnight" },
],
```

The file has two top-level selectors:

```css
.light-theme {
  /* applied in light mode */
}

.dark-theme {
  /* applied in dark mode */
}
```

Values shared by both modes go in a combined block:

```css
.light-theme,
.dark-theme {
  /* applied in both */
}
```

**`.dark-theme` is optional.** If you leave it out, dark mode falls back to Beekeeper Studio's default neutrals. A light-only theme is a perfectly valid starting point.

## 2. Base colors

The only color you must set is the page background:

```css
.light-theme {
  --background: WhiteSmoke;
}

.dark-theme {
  --background: #010109;
}
```

That alone is a working theme.

The second color worth setting is `--base-gray`. Most of the interface — backgrounds, borders, text, sidebars, tables, panels — is built from the gray scale, so this one value changes the overall character of the app more than anything else.

```css
.light-theme {
  --background: WhiteSmoke;
  --base-gray: DarkSlateGray;
}

.dark-theme {
  --background: #010109;
  --base-gray: #615A7C;
}
```

Everything else is **optional**. Set an accent hue only if you want to move it away from the default:

```css
--base-accent: #fad83b;
--base-yellow: #fad83b;
--base-blue: #3498db;
--base-green: #15db95;
--base-orange: #ff8d21;
--base-red: #ff5d59;
--base-purple: #9858ff;
--base-pink: #ff00f0;
```

Each one is expanded into a full scale automatically, so a single hex gives you backgrounds, hovers, borders, solid fills and text for that color.

`--base-accent` is the color the app treats as primary: solid buttons, active pills, selected table headers. It uses a gray color by default.

## 3. Component colors

You can be more specific by setting the colors for individual components:

```css
.dark-theme {
  --sidebar-bg: black;
}
```

### Available tokens

| Area | Tokens | Notes |
| ---- | ------ | ----- |
| App | `--app-bg`, `--app-fg`, `--focus-ring` | Window background, default text, focus outline |
| Button | `--btn-fg`, `--btn-bg`, `--btn-shadow` and `-hover` variants | Ghost buttons (transparent by default) |
| | `--btn-flat-*` | Flat buttons, with a subtle fill |
| | `--btn-primary-*` | Solid accent buttons |
| Icon Button | `--btn-icon-fg`, `--btn-icon-fg-hover` | Toolbar icon buttons |
| Input | `--input-bg`, `--input-fg`, `--input-border`, `--input-border-focus` | Text fields and textareas |
| Select | `--select-arrow` | Dropdown arrow, a `url()` of an inline SVG |
| Checkbox | `--checkbox-border`, `--checkbox-bg`, `--checkbox-checked-bg`, `--checkbox-checked-fg` | Checkboxes and radios |
| Link | `--link-fg` | Hyperlinks |
| Selection | `--selection-bg`, `--selection-fg` | Selected text |
| Scrollbar | `--scrollbar-track`, `--scrollbar-thumb` | Scrollbars |
| Titlebar | `--titlebar-bg`, `--titlebar-fg`, `--titlebar-inactive-*` | Window title bar, focused and unfocused |
| Sidebar | `--sidebar-bg`, `--sidebar-fg` | Table and query lists |
| Panel | `--panel-bg`, `--panel-fg`, `--panel-bg-hover`, `--panel-shadow` | Anything floating above the app: menus, modals, tooltips, cards |
| Overlay | `--overlay-bg`, `--overlay-subtle-bg` | Dimmed backdrop behind modals |
| Nav Pills | `--nav-pill-fg`, `--nav-pill-active-fg`, `--nav-pill*-shadow*` | Tab strips such as Columns / Indexes / Relations |
| Tree | `--tree-guide-border`, `--tree-guide-border-hover` | Indent guides in tree lists |
| Table | `--table-bg`, `--table-fg` | Result grid surface |
| | `--table-header-*` | Column headers, including highlighted and selected |
| | `--table-row-odd-bg`, `--table-row-even-bg` | Row striping |
| | `--table-row-added-bg`, `--table-row-deleted-bg`, `--table-row-error-bg` | Pending edits and failures |
| | `--table-cell-*` | Cell hover, selection, editing and edited states |
| | `--table-range-border`, `--table-range-handle-bg`, `--table-resize-guide-bg` | Range selection and column resizing |
| Alert | `--alert-bg`, `--alert-fg` | Inline notices |
| Kbd | `--kbd-bg`, `--kbd-fg`, `--kbd-shadow` | Keyboard shortcut chips |
| Badge | `--badge-flat-bg`, `--badge-flat-fg` | Neutral badges |
| | `--badge-primary-bg`, `--badge-primary-fg` | Prominent badges |
| Statusbar | `--statusbar-bg`, `--statusbar-fg`, `--statusbar-fg-inverse` | Bar along the bottom |
| Tabs | `--tabs-header-bg`, `--tab-bg`, `--tab-fg`, `--tab-active-bg`, `--tab-active-fg` | Editor tab strip |
| Editor | `--editor-bg`, `--editor-fg`, `--editor-cursor-bg`, `--editor-gutter-*`, `--editor-linenumber-*`, `--editor-searchmatch-*`, `--editor-vim-panel-*` | SQL editor chrome |
| Editor syntax | `--syntax-keyword`, `--syntax-string`, `--syntax-constant`, `--syntax-variable`, `--syntax-function`, `--syntax-type`, `--syntax-decorator`, `--syntax-link`, `--syntax-diff`, `--syntax-comment`, `--syntax-punctuation` | Syntax highlighting, by category |
| Mongo Shell | `--mongo-shell-mongo-prompt-fg`, `--mongo-shell-ansi-output-fg` | Mongo shell output |

The full list, with every default value, is in `apps/studio/src/assets/styles/themes/tokens/component.css`.

## 4. Going deeper

Beekeeper Studio primarily uses the [Radix Colors](https://www.radix-ui.com/colors) convention. See [Theme Color System](./theme-color-system.md).
