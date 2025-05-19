# Beekeeper Studio Theming System

## Overview

Beekeeper Studio uses a robust SCSS-based theming system that allows for consistent styling across the application while supporting multiple themes. This document outlines the architecture, patterns, and best practices for working with the theming system.

## Architecture

The theming system is organized with the following structure:

- **Base Variables**: Defined in `apps/studio/src/assets/styles/app/_variables.scss`, these variables serve as the foundation for all themes.
- **Theme-specific Variables**: Each theme has its own variables file (e.g., `apps/studio/src/assets/styles/themes/dark/variables.scss`) that can override base variables.
- **Theme Implementation**: Theme implementation files (e.g., `apps/studio/src/assets/styles/themes/dark/theme.scss`) define the actual styles using the variables.
- **Application Stylesheets**: Components use variables from the base and theme files to ensure consistent styling.

## SCSS Variables Organization

### Base Variables (`_variables.scss`)

The base variables file contains default values for all variables used throughout the application:

- **Theme Colors**: Primary colors, background colors, and accent colors
- **Text Colors**: Various text color variations (dark, light, lighter)
- **Brand Colors**: Colors for status indicators, warnings, errors, and success states
- **Layout Variables**: Spacing, padding, margins, and dimensions
- **Component-specific Variables**: Variables for specific UI components

These variables all include the `!default` flag, allowing themes to override them as needed.

### Theme Variables

Each theme has its own variables file that can override base variables:

```scss
// Example from dark theme variables
$theme-bg: #181818;
$theme-base: #fff;
$theme-primary: #fad83b;
$theme-secondary: #4ad0ff;

// Derived colors
$text-dark: rgba($theme-base, 0.87);
$text: rgba($theme-base, 0.67);
// ...more variable definitions
```

## Correct Import Patterns

The SCSS module system requires careful attention to how files are imported. Here are the correct import patterns:

### In Theme Files

Theme files should import both their own variables and the base variables:

```scss
@use "./variables.scss" as variables;     // Theme-specific variables
@use "../../app/_variables.scss" as *;    // Base variables
@use "sass:color";                        // SASS built-in modules
```

This pattern allows the theme to:
1. Access its own variables with a namespace (`variables.$theme-bg`)
2. Access base variables directly (`$gutter-w`)
3. Use SASS built-in functions (`color.adjust()`)

### In Component Files

Component files should import the base variables:

```scss
@use "./vendor/_shared_imports" as *;     // Any shared vendor imports
@use "./_variables" as *;                 // Base variables
```

## Common Pitfalls and Solutions

### 1. Undefined Variables

**Issue**: "Undefined variable" errors occur when a variable is used without being properly imported.

**Solution**: Ensure that the required variable files are imported with the correct namespace:
- For base variables: `@use "../../app/_variables.scss" as *;`
- For theme variables: `@use "./variables.scss" as variables;`

### 2. Namespace Conflicts

**Issue**: "There is no module with the namespace 'variables'" error occurs when a variable is referenced with a namespace that doesn't exist.

**Solution**:
- When importing with `as *`, reference variables directly: `$theme-bg`
- When importing with `as variables`, use the namespace: `variables.$theme-bg`
- Be consistent with your namespace choice throughout a file

### 3. Module Conflicts

**Issue**: "This module was already loaded with a different configuration" error occurs when the same module is imported multiple times with different configurations.

**Solution**:
- Import each module only once per file
- Use the same namespace when importing a module in different files
- For files imported in many places, prefer using the same import pattern consistently

## Best Practices

### Creating a New Theme

1. **Create the variables file first**:
   - Start by copying an existing theme's variables file
   - Modify the core colors (`$theme-bg`, `$theme-base`, `$theme-primary`, etc.)
   - Test derived colors to ensure they have sufficient contrast

2. **Create the theme implementation file**:
   - Import variables correctly (see import patterns above)
   - Start with essential styles (body, text colors)
   - Implement component-specific overrides as needed

3. **Test thoroughly**:
   - Check all UI components in your new theme
   - Verify contrast ratios for accessibility
   - Test in light and dark modes if applicable

### Modifying Existing Themes

1. **Understand variable relationships**:
   - Before changing a variable, understand what other styles depend on it
   - Use browser developer tools to identify which variables affect specific elements

2. **Make minimal changes**:
   - Change as few variables as possible to achieve the desired effect
   - Prefer modifying theme variables over adding new style rules

3. **Test changes across components**:
   - A change to one variable might affect multiple components
   - Verify that your changes don't unintentionally affect other parts of the UI

### Adding New Variables

1. **Add to base variables first**:
   - New variables should be added to `_variables.scss` with the `!default` flag
   - Use naming conventions consistent with existing variables
   - Group related variables together

2. **Document the purpose**:
   - Add comments explaining what the variable is used for
   - If a variable has specific constraints, document them

3. **Update themes as needed**:
   - After adding a base variable, update theme-specific variables files if necessary

## Themes Overview

Beekeeper Studio currently includes the following themes:

1. **Dark** (default): A dark theme with high contrast
2. **Light**: A light theme with dark text on light backgrounds
3. **Solarized Dark**: Based on the popular Solarized color scheme
4. **Solarized Light**: Light version of the Solarized theme

Each theme follows the same structure but provides a unique visual experience through careful color selection and component styling.

## Conclusion

The Beekeeper Studio theming system provides flexibility and consistency through proper use of SCSS variables and modules. By following the patterns and best practices outlined in this document, you can maintain existing themes or create new ones while avoiding common pitfalls. 
