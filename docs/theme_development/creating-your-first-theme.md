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
      --background: AliceBlue;
    }

    .dark-theme {
      --background: #0b1325;
    }
    ```

    That's a working theme already! `.light-theme` applies in light mode and `.dark-theme` in dark mode.

    If you only want to style dark mode, you can omit `.light-theme` entirely:

    ```css
    .dark-theme {
      --background: #0b1325;
    }
    ```

    In this case, the app will use the default theme's light colors.

    !!! note "Every color is optional"
        Anything you leave out uses the default. `--background` defaults to `white` in light mode and `#121212` in dark mode.

    Now, your project structure should look like this:
    ```
    my-first-theme/
    ├── manifest.json
    └── style.css
    ```

## Install Your Theme

Beekeeper Studio loads themes from its themes directory. While you develop, link your theme folder into that directory with a symbolic link. Your folder stays wherever you like.

1. Enable unlisted themes

    Themes you add to the themes directory yourself are called *unlisted* themes, and Beekeeper Studio doesn't load them by default.

    Go to **View → Appearance → Configure...**. Enable Unlisted Themes.

    ![Appearance settings with the Configure button for theme configuration](/assets/images/themes/configure-unlisted-themes.png)

    Or you can set this value in your [config](../user_guide/configuration.md#config-ref) file:

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
        Your theme stays where you keep your code, and uninstalling the theme from Beekeeper Studio can't delete your files by accident.

3. Restart Beekeeper Studio

    Beekeeper Studio scans the themes directory on startup.

## Test Your Theme

1. Open Beekeeper Studio (after [installing your theme](#install-your-theme))
2. Go to **View → Appearance**
3. Select **My First Theme**
4. **Boom!** Your theme is live 🎯

!!! tip "Hot reload"
    Edit `style.css` and the app hot reloads your changes.

![Beekeeper Studio welcome screen with the theme's dark background](/assets/images/themes/first-theme-dark.png)

## Add Some Color

`--background` is just the start. Next up is `--base-accent`, the color the app treats as primary: solid buttons, active pills, selected table headers. The default accent is gray.

```diff
.light-theme {
  --background: AliceBlue;
+ --base-accent: #0969da;
}

.dark-theme {
  --background: #0b1325;
+ --base-accent: #1f6feb;
}
```

!!! tip
    Base colors accept any CSS color value: hex (`#fad83b`), named colors (`WhiteSmoke`), `rgb()`, `hsl()`, `oklch()`, `lab()` or `color()`. `color-mix()` and relative colors (`rgb(from …)`) are not supported.

![Beekeeper Studio with the theme's accent color applied](/assets/images/themes/first-theme-accent.png)

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
  --background: #0b1325;
  --base-accent: #1f6feb;
+ --sidebar-bg: black;
}
```

See [`component.css`](https://github.com/beekeeper-studio/beekeeper-studio/blob/master/apps/studio/src/assets/styles/tokens/component.css) for every token you can set.

## Syntax Highlighting

Make the SQL editor match your theme! This time, let's make colors that apply to both light and dark theme:

```diff
.dark-theme {
  --background: #0b1325;
  --base-accent: #1f6feb;
  --sidebar-bg: black;
}

+ .light-theme, .dark-theme {
+   --syntax-keyword: #e01b6a;
+   --syntax-variable: #d97706;
+   --syntax-comment: #5a6b8c;
+ }
```

See [Syntax Highlighting](color-system.md#syntax-highlighting) for every syntax token you can set.

## Final Result

Your complete `style.css`:

```css
.light-theme {
  --background: AliceBlue;
  --base-accent: #0969da;
}

.dark-theme {
  --background: #0b1325;
  --base-accent: #1f6feb;
  --sidebar-bg: black;
}

.light-theme, .dark-theme {
  --syntax-keyword: #e01b6a;
  --syntax-variable: #d97706;
  --syntax-comment: #5a6b8c;
}
```

![Beekeeper Studio with the finished theme](/assets/images/themes/first-theme-full.png)

## What's Next? 🚀

-   **[`component.css`](https://github.com/beekeeper-studio/beekeeper-studio/blob/master/apps/studio/src/assets/styles/tokens/component.css)** - Every component token you can set, with its default value
-   **[Color System](color-system.md)** - Learn how base colors become full scales, following the [Radix Colors](https://www.radix-ui.com/colors) convention
-   **[Publishing Themes](publishing-themes.md)** - Share your creation with the world!
