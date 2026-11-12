---
title: Creating Your First Theme
summary: "Step-by-step guide to creating your first Beekeeper Studio theme."
icon: material/palette
---

# Creating Your First Theme

Let's build your first theme! You'll create a theme with just one color, then learn how to recolor the whole app and style individual components.

## What You Need

-   Basic CSS knowledge
-   Beekeeper Studio installed
-   **[Unlisted themes enabled](#install-your-theme)**

## Create Your Theme

A theme only needs two files:

* `manifest.json` - defines the theme info (name, author, version, etc.)
* `style.css` - your theme's colors

1. Create Your Theme Folder

    First, create a folder anywhere you like for your theme:

    ```bash
    mkdir my-first-theme
    cd my-first-theme
    ```

2. Create the Manifest

    Create `manifest.json` - this tells Beekeeper Studio about your theme:

    ```json
    {
        "id": "my-first-theme",
        "name": "My First Theme",
        "author": {
            "name": "Your Name",
            "url": "https://yourwebsite.com"
        },
        "description": "My first awesome theme!",
        "version": "1.0.0"
    }
    ```

3. Create the Style File

    Create `style.css` - your theme's colors:

    ```css
    .light-theme {
      --background: WhiteSmoke;
    }

    .dark-theme {
      --background: #010109;
    }
    ```

    That's a working theme already! `.light-theme` applies in light mode and `.dark-theme` in dark mode. Values shared by both modes go in a combined block:

    ```css
    .light-theme,
    .dark-theme {
      /* applied in both */
    }
    ```

    !!! note "Every color is optional"
        Anything you leave out uses the default. `--background` defaults to `white` in light mode and `#121212` in dark mode, and if you leave out `.dark-theme` entirely, dark mode uses Beekeeper Studio's default theme.

    Now, your project structure should look like this:
    ```
    my-first-theme/
    ├── manifest.json
    └── style.css
    ```

## Install Your Theme

Beekeeper Studio loads themes from its themes directory. While you develop, link your theme folder into that directory with a symbolic link. Your folder stays wherever you like, and Beekeeper Studio always loads your latest changes.

1. Enable unlisted themes

    Themes you add to the themes directory yourself are called *unlisted* themes, and Beekeeper Studio doesn't load them by default. Set this value in your [config](../user_guide/configuration.md#config-ref):

    ```ini
    [themeSystem]
    unlistedDisabled = false
    ```

2. Link your folder into the themes directory

    Run this from your theme folder (`my-first-theme`):

    === "Linux"
        ```bash
        mkdir -p ~/.config/beekeeper-studio/themes
        ln -s "$(pwd)" ~/.config/beekeeper-studio/themes/my-first-theme
        ```

    === "macOS"
        ```bash
        mkdir -p "$HOME/Library/Application Support/beekeeper-studio/themes"
        ln -s "$(pwd)" "$HOME/Library/Application Support/beekeeper-studio/themes/my-first-theme"
        ```

    === "Windows"
        ```cmd
        if not exist "%APPDATA%\beekeeper-studio\themes" mkdir "%APPDATA%\beekeeper-studio\themes"
        mklink /J "%APPDATA%\beekeeper-studio\themes\my-first-theme" "%CD%"
        ```

    === "Windows (Portable)"
        ```cmd
        mklink /J "{beekeeper-studio-directory}\beekeeper-studio-data\themes\my-first-theme" "%CD%"
        ```

    !!! warning "The link name must match your theme id"
        The folder name inside the themes directory must be the same as the `id` in your `manifest.json` (`my-first-theme` in this guide).

    !!! tip "Why use a symbolic link?"
        Your theme stays where you keep your code, and uninstalling the theme from Beekeeper Studio can't delete your files by accident. You can also copy the folder into the themes directory instead, but then you need to copy it again after every change.

3. Restart Beekeeper Studio

    Beekeeper Studio scans the themes directory when it starts, so restart it after adding a new theme. You only need to do this once: after that, changes to `style.css` show up right away.

## Test Your Theme

1. Open Beekeeper Studio (after [installing your theme](#install-your-theme))
2. Go to **View → Appearance**
3. Look for **My First Theme** - if it's there, you're golden! ✨
4. Select it
5. **Boom!** Your theme is live 🎯 Edit `style.css` and the app hot reloads your changes.

## Add Some Color

`--background` is just the start. Next up is `--base-accent`, the color the app treats as primary: solid buttons, active pills, selected table headers. The default accent is gray.

```diff
.light-theme {
  --background: WhiteSmoke;
+ --base-accent: #0969da;
}

.dark-theme {
  --background: #010109;
+ --base-accent: #1f6feb;
}
```

!!! tip
    Base colors accept any CSS color value: hex (`#fad83b`), named colors (`WhiteSmoke`), `rgb()`, `hsl()`, `oklch()`, `lab()` or `color()`. `color-mix()` and relative colors (`rgb(from …)`) are not supported.

You can set other base colors too as needed:

```css
--base-gray: DarkSlateGray;
--base-yellow: #fad83b;
--base-blue: #3498db;
--base-green: #15db95;
--base-orange: #ff8d21;
--base-red: #ff5d59;
--base-purple: #9858ff;
--base-pink: #ff00f0;
```

## Style Components

Want more control? Set the colors for individual components:

```diff
.dark-theme {
  --background: #010109;
  --base-accent: #1f6feb;
+ --sidebar-bg: black;
}
```

See [`component.css`](https://github.com/beekeeper-studio/beekeeper-studio/blob/master/apps/studio/src/assets/styles/tokens/component.css) for every token you can set.

## Syntax Highlighting

Make the SQL editor match your theme! Editor colors are grouped into eleven categories, so a few lines recolor everything:

```diff
.dark-theme {
  --background: #010109;
  --base-accent: #1f6feb;
  --sidebar-bg: black;
+ --syntax-keyword: #ff7b72;
+ --syntax-string: #a5d6ff;
+ --syntax-comment: #8b949e;
}
```

Here are all the categories:

```css
--syntax-keyword      --syntax-string       --syntax-constant
--syntax-variable     --syntax-function     --syntax-type
--syntax-decorator    --syntax-link         --syntax-diff
--syntax-comment      --syntax-punctuation
```

!!! tip "Need more control?"
    Each category colors a group of more specific `--editor-*-fg` tokens. Set one of those to change a single token type, like numbers:

    ```css
    --editor-number-fg: #79c0ff;
    ```

## Final Result

Your complete `style.css`:

```css
.light-theme {
  --background: WhiteSmoke;
  --base-accent: #0969da;
}

.dark-theme {
  --background: #010109;
  --base-accent: #1f6feb;
  --sidebar-bg: black;
  --syntax-keyword: #ff7b72;
  --syntax-string: #a5d6ff;
  --syntax-comment: #8b949e;
}
```

## What's Next? 🚀

-   **[`component.css`](https://github.com/beekeeper-studio/beekeeper-studio/blob/master/apps/studio/src/assets/styles/tokens/component.css)** - Every component token you can set, with its default value
-   **[Color System](color-system.md)** - Learn how base colors become full scales, following the [Radix Colors](https://www.radix-ui.com/colors) convention
-   **[Publishing Themes](publishing-themes.md)** - Share your creation with the world!
