import { defaultThemes } from './ThemeConfigurations';

function logTheme(source: string, theme: string) {
  console.log(`[ThemeInitializer] Theme from ${source}: ${theme}`);
}

export async function initializeTheme() {
  try {
    // get active theme from localStorage or default to 'dark'
    let activeTheme = localStorage.getItem('activeTheme');
    let themeSource = 'localStorage';

    logTheme('localStorage', activeTheme || 'not set');

    // If no theme in localStorage, try to fetch from store (if it's available)
    if (!activeTheme) {
      try {
        if (typeof window !== 'undefined' &&
          // @ts-ignore - Accessing potential global Vue app
          window.$store &&
          // @ts-ignore
          window.$store.getters &&
          // @ts-ignore
          window.$store.getters['settings/themeValue']) {
          // @ts-ignore
          activeTheme = window.$store.getters['settings/themeValue'];
          themeSource = 'settings store';
          logTheme('settings store', activeTheme);

          // save to localStorage for future consistency
          localStorage.setItem('activeTheme', activeTheme);
          console.log(`[ThemeInitializer] Saved store theme to localStorage: ${activeTheme}`);
        }
      } catch (err) {
        console.log('[ThemeInitializer] Could not access store:', err);
      }
    }

    // default to dark if nothing found
    if (!activeTheme) {
      activeTheme = 'dark';
      themeSource = 'default';
      logTheme('default', activeTheme);

      // save default to localStorage
      localStorage.setItem('activeTheme', activeTheme);
    } else {
      // make sure the store is updated with the localStorage value
      try {
        if (typeof window !== 'undefined' &&
          // @ts-ignore - Accessing potential global Vue app
          window.$store &&
          // @ts-ignore
          window.$store.dispatch) {
          console.log(`[ThemeInitializer] Saving theme from ${themeSource} to database: ${activeTheme}`);

          // @ts-ignore
          window.$store.dispatch('settings/save', {
            key: 'theme',
            value: activeTheme
          }).then(() => {
            console.log(`[ThemeInitializer] Successfully saved theme to settings database: ${activeTheme}`);
          }).catch(err => {
            console.error('[ThemeInitializer] Error syncing theme with database:', err);
          });
        }
      } catch (err) {
        console.log('[ThemeInitializer] Could not sync theme with store:', err);
      }
    }

    // for system theme, check user preference
    if (activeTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      activeTheme = prefersDark ? 'dark' : 'light';
    }

    // apply theme class directly and forcefully
    document.body.className = document.body.className
      .replace(/theme-[a-zA-Z0-9-_]+/g, '')
      .trim() + ` theme-${activeTheme}`;

    // also apply to document element for CSS variable inheritance
    document.documentElement.className = document.documentElement.className
      .replace(/theme-[a-zA-Z0-9-_]+/g, '')
      .trim() + ` theme-${activeTheme}`;

    // set theme-specific CSS variables based on the active theme
    const themeVariables = getThemeVariables(activeTheme);

    // apply variables directly to root and body
    Object.entries(themeVariables).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
      document.body.style.setProperty(key, value);
    });

    // make sure vars applied with !important to override any conflicting styles
    applyThemeWithPriority(activeTheme, themeVariables);

    // ensure the theme variables are applied
    document.documentElement.style.setProperty('--theme-active', activeTheme);

    // verify theme application
    verifyThemeApplication(activeTheme, themeVariables);

    return activeTheme;
  } catch (error) {
    console.error('[ThemeInitializer] Error initializing theme:', error);

    // fallback to dark theme
    document.body.className = document.body.className
      .replace(/theme-[a-zA-Z0-9-_]+/g, '')
      .trim() + ' theme-dark';

    document.documentElement.className = document.documentElement.className
      .replace(/theme-[a-zA-Z0-9-_]+/g, '')
      .trim() + ' theme-dark';

    return 'dark';
  }
}

function applyThemeWithPriority(themeName: string, variables: Record<string, string>) {
  // create a style element specifically for theme variables
  let styleElement = document.getElementById('beekeeper-theme-vars');

  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'beekeeper-theme-vars';
    document.head.appendChild(styleElement);
  }

  // build CSS content with !important flag for priority
  let cssContent = `
    /* Theme variables for ${themeName} */
    :root {
  `;

  // add each variable with !important
  Object.entries(variables).forEach(([key, value]) => {
    cssContent += `      ${key}: ${value} !important;\n`;
  });

  cssContent += `
    }
    
    /* Apply to body as well for components that might not inherit from :root */
    body {
  `;

  // apply to body as well
  Object.entries(variables).forEach(([key, value]) => {
    cssContent += `      ${key}: ${value} !important;\n`;
  });

  cssContent += `
    }
    
    /* Ensure proper theme class is set */
    html, body {
      color-scheme: ${themeName.includes('light') ? 'light' : 'dark'};
    }
    
    /* Ensure proper theme background and text colors */
    .theme-${themeName} {
      background-color: ${variables['--theme-bg']} !important;
      color: ${variables['--theme-base']} !important;
    }
    
    /* Apply to connection interface specifically */
    .theme-${themeName} .connection-main {
      background-color: ${variables['--theme-bg']} !important;
    }
    
    /* Ensure sidebar and all nested elements have the correct background */
    .theme-${themeName} .sidebar-wrapper,
    .theme-${themeName} .sidebar,
    .theme-${themeName} .connection-sidebar,
    .theme-${themeName} .interface .sidebar,
    .theme-${themeName} .interface-wrap .sidebar,
    .theme-${themeName} .interface-wrap .global-items,
    .theme-${themeName} .sidebar-wrap {
      background-color: ${variables['--sidebar-bg']} !important;
    }
  `;

  styleElement.textContent = cssContent;
}

/**
 * verify theme application by checking computed styles
 */
function verifyThemeApplication(themeName: string, variables: Record<string, string>) {
  // wait for next render cycle to check computed styles
  setTimeout(() => {
    // check root element
    const rootStyles = getComputedStyle(document.documentElement);

    // check a few key variables
    const themeBackground = rootStyles.getPropertyValue('--theme-bg').trim();

    // check body class
    const hasThemeClass = document.body.classList.contains(`theme-${themeName}`);

    // alert if verification fails
    if (themeBackground !== variables['--theme-bg'] || !hasThemeClass) {
      console.warn(`[ThemeInitializer] Theme verification failed for ${themeName}!`);
    }
  }, 50);
}

function getThemeVariables(themeName: string): Record<string, string> {
  const baseVariables = {
    '--theme-active': themeName,
  };

  const themeConfig = defaultThemes.find(theme => theme.id === themeName) ||
    defaultThemes.find(theme => theme.id === 'dark');

  if (!themeConfig) {
    console.warn(`[ThemeInitializer] Theme "${themeName}" not found, falling back to default dark theme`);
    return {
      ...baseVariables,
      '--theme-bg': '#252525',
      '--theme-base': '#ffffff',
      '--theme-string': '#a5d6ff',
      '--theme-keyword': '#ff7b72',
      '--theme-primary': '#ff7b72',
      '--theme-secondary': '#4ad0ff',
      '--border-color': 'rgba(255, 255, 255, 0.1)',
      '--sidebar-bg': '#1e1e1e',
    };
  }

  // extract colors from the theme configuration
  const { background, foreground, string, keyword } = themeConfig.colors;

  // calculate a lighter sidebar background color (about 10% lighter)
  // for dark themes, make it slightly lighter, for light themes make it slightly darker
  const isDarkTheme = isColorDark(background);
  let sidebarBg = background;

  if (isDarkTheme) {
    // for dark themes, lighten the sidebar
    sidebarBg = lightenColor(background, 10);
  } else {
    // for light themes, darken the sidebar slightly
    sidebarBg = darkenColor(background, 5);
  }

  // some themes have special sidebar backgrounds
  const specialSidebarColors: Record<string, string> = {
    'dark': '#1e1e1e',
    'light': '#f5f5f5',
    'solarized': '#eee8d5',
    'solarized-dark': '#103c48',
    'github-dark': '#010409',
    'shades-of-purple': '#3B3975',
  };

  // use special sidebar color if defined
  if (specialSidebarColors[themeName]) {
    sidebarBg = specialSidebarColors[themeName];
  }

  // create border color with appropriate opacity based on foreground color
  const borderColor = `rgba(${colorToRgb(foreground)}, 0.1)`;

  return {
    ...baseVariables,
    '--theme-bg': background,
    '--theme-base': foreground,
    '--theme-string': string,
    '--theme-keyword': keyword,
    '--theme-primary': keyword,
    '--theme-secondary': string,
    '--border-color': borderColor,
    '--sidebar-bg': sidebarBg,
  };
}

function colorToRgb(hex: string): string {
  // remove # if present
  hex = hex.replace('#', '');

  // convert 3-digit hex to 6-digit
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  // parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `${r}, ${g}, ${b}`;
}

function isColorDark(hex: string): boolean {
  // remove # if present
  hex = hex.replace('#', '');

  // convert 3-digit hex to 6-digit
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  // calculate luminance
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // calculate relative luminance using the formula for perceived brightness
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  // consider colors with luminance < 0.5 as dark
  return luminance < 0.5;
}

function lightenColor(hex: string, percent: number): string {
  return adjustColor(hex, percent);
}

function darkenColor(hex: string, percent: number): string {
  return adjustColor(hex, -percent);
}

function adjustColor(hex: string, percent: number): string {
  // remove # if present
  hex = hex.replace('#', '');

  // convert 3-digit hex to 6-digit
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  // parse the hex values
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // adjust each color component
  r = Math.min(255, Math.max(0, Math.round(r + (percent / 100) * 255)));
  g = Math.min(255, Math.max(0, Math.round(g + (percent / 100) * 255)));
  b = Math.min(255, Math.max(0, Math.round(b + (percent / 100) * 255)));

  // convert back to hex
  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}

export function setupThemeChangeListener() {
  // watch for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  mediaQuery.addEventListener('change', (_e) => {
    // only update if using system theme
    const activeTheme = localStorage.getItem('activeTheme');
    if (activeTheme === 'system') {
      // re-initialize with the new theme
      initializeTheme();
    }
  });
} 
