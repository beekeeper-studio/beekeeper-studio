# Beekeeper Studio Theming System

## Overview

Beekeeper Studio uses a SCSS-based theming system that supports multiple themes while maintaining consistent styling. This document outlines the architecture and best practices.

## Architecture

The theming system structure:

- **Base Variables**: `apps/studio/src/assets/styles/app/_variables.scss` - foundation for all themes
- **Theme Variables**: Theme-specific files that override base variables
- **Theme Implementation**: Style files defining actual styles using the variables
- **Application Stylesheets**: Component styles using the variables

## SCSS Variables Organization

### Base Variables (`_variables.scss`)

Contains default values (with `!default` flag) for:
- Theme colors (primary, background, accent)
- Text colors (dark, light, lighter)
- Brand colors (status, warning, error, success)
- Layout variables (spacing, padding, margins)
- Component-specific variables

### Theme Variables

Each theme overrides base variables as needed:

```scss
// Example from dark theme
$theme-bg: #181818;
$theme-base: #fff;
$theme-primary: #fad83b;
$theme-secondary: #4ad0ff;
```

## Import Patterns

### In Theme Files

```scss
@use "./variables.scss" as variables;     // Theme-specific variables
@use "../../app/_variables.scss" as *;    // Base variables
@use "sass:color";                        // SASS built-in modules
```

### In Component Files

```scss
@use "./vendor/_shared_imports" as *;     // Shared vendor imports
@use "./_variables" as *;                 // Base variables
```

## Common Pitfalls and Solutions

### 1. Undefined Variables
- **Issue**: Variable used without proper import
- **Solution**: Import with correct namespace

### 2. Namespace Conflicts
- Use consistent namespace references
- `as *` → direct reference: `$theme-bg`
- `as variables` → namespaced: `variables.$theme-bg`

### 3. Module Conflicts
- Import each module once per file
- Use consistent namespaces

## Best Practices

### Creating a New Theme
1. Copy an existing theme's variables file and modify core colors
2. Create implementation file with correct imports
3. Test across all UI components and check contrast ratios

### Modifying Existing Themes
- Understand variable dependencies
- Make minimal changes
- Test changes across all affected components

### Adding New Variables
- Add to base variables first with `!default` flag
- Use consistent naming conventions
- Document purpose and update theme files as needed

## Themes Overview

Each theme follows the same structure but provides a unique visual experience through color selection and component styling. Following these patterns ensures flexibility and consistency.

## Recent Improvements

### Sidebar-Based Theme Management

- **Previous**: Menu-based selection requiring IPC communication
- **New**: Sidebar button that appears on hover, providing more intuitive UI and simpler implementation

### Single Source of Truth

- **Previous**: Theme definitions duplicated across files
- **New**: `defaultThemes` array in `ThemeConfigurations.ts` serves as single source, with `ThemeInitializer.ts` using it to generate CSS variables

### Dynamic Color Calculations

- Sidebar colors now automatically calculated from main background color:
  - Dark themes: Lightened 10%
  - Light themes: Darkened 5%
  - With override capability for special cases

### Simplified Implementation

```typescript
// ThemeConfigurations.ts - Theme definitions
export const defaultThemes: Theme[] = [
  {
    id: 'dark',
    name: 'Dark',
    colors: {
      background: '#252525',
      foreground: '#ffffff',
      string: '#a5d6ff',
      keyword: '#ff7b72'
    }
  },
  // More themes...
];

// ThemeInitializer.ts - Generates variables
function getThemeVariables(themeName: string) {
  const theme = defaultThemes.find(t => t.id === themeName);
  const { background, foreground, string, keyword } = theme.colors;
  
  // Calculate sidebar color based on background
  const sidebarBg = isColorDark(background) 
    ? lightenColor(background, 10) 
    : darkenColor(background, 5);
  
  return {
    '--theme-bg': background,
    '--theme-base': foreground,
    '--theme-string': string,
    '--theme-keyword': keyword,
    '--sidebar-bg': sidebarBg,
  };
}
```

### Benefits

1. **Improved Maintainability**: Single source of truth
2. **Reduced Duplication**: Automated CSS variable generation
3. **Better UX**: More discoverable theme management
4. **Consistent Appearance**: Automatic color calculations
5. **Simplified Architecture**: No complex IPC communication
