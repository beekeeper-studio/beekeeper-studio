/**
 * Initializes and applies the current theme on application start
 */
export async function initializeTheme() {
  try {
    // Get active theme from localStorage or default to 'dark'
    let activeTheme = localStorage.getItem('activeTheme') || 'dark';

    console.log('[ThemeInitializer] Initializing theme:', activeTheme);

    // For system theme, check user preference
    if (activeTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      activeTheme = prefersDark ? 'dark' : 'light';
      console.log('[ThemeInitializer] System theme preference detected:', activeTheme);
    }

    // Apply theme class directly and forcefully
    document.body.className = document.body.className
      .replace(/theme-[a-zA-Z0-9-_]+/g, '')
      .trim() + ` theme-${activeTheme}`;

    // Also apply to document element for CSS variable inheritance
    document.documentElement.className = document.documentElement.className
      .replace(/theme-[a-zA-Z0-9-_]+/g, '')
      .trim() + ` theme-${activeTheme}`;

    console.log('[ThemeInitializer] Applied theme class to body:', document.body.className);
    console.log('[ThemeInitializer] Applied theme class to documentElement:', document.documentElement.className);

    // Set theme-specific CSS variables based on the active theme
    const themeVariables = getThemeVariables(activeTheme);
    console.log('[ThemeInitializer] Theme variables:', themeVariables);

    // Apply variables directly to root and body
    Object.entries(themeVariables).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
      document.body.style.setProperty(key, value);
    });

    // Ensure the theme variables are applied with !important to override any conflicting styles
    applyThemeWithPriority(activeTheme, themeVariables);

    // Ensure the theme variables are applied
    document.documentElement.style.setProperty('--theme-active', activeTheme);

    // If we're in Electron, use the IPC to get theme CSS
    if (window.electron && window.electron.ipcRenderer) {
      try {
        // Request theme application
        await (window.electron.ipcRenderer as any).invoke('themes/apply', { name: activeTheme });
        console.log('[ThemeInitializer] Theme applied via IPC');
      } catch (err) {
        console.error('[ThemeInitializer] Error applying theme via IPC:', err);
      }
    }

    // Verify theme application
    verifyThemeApplication(activeTheme, themeVariables);

    return activeTheme;
  } catch (error) {
    console.error('[ThemeInitializer] Error initializing theme:', error);

    // Fallback to dark theme
    document.body.className = document.body.className
      .replace(/theme-[a-zA-Z0-9-_]+/g, '')
      .trim() + ' theme-dark';

    document.documentElement.className = document.documentElement.className
      .replace(/theme-[a-zA-Z0-9-_]+/g, '')
      .trim() + ' theme-dark';

    return 'dark';
  }
}

/**
 * Apply theme variables with higher priority to overcome any specificity issues
 */
function applyThemeWithPriority(themeName: string, variables: Record<string, string>) {
  // Create a style element specifically for theme variables
  let styleElement = document.getElementById('beekeeper-theme-vars');

  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'beekeeper-theme-vars';
    document.head.appendChild(styleElement);
  }

  // Build CSS content with !important flag for priority
  let cssContent = `
    /* Theme variables for ${themeName} */
    :root {
  `;

  // Add each variable with !important
  Object.entries(variables).forEach(([key, value]) => {
    cssContent += `      ${key}: ${value} !important;\n`;
  });

  cssContent += `
    }
    
    /* Apply to body as well for components that might not inherit from :root */
    body {
  `;

  // Apply to body as well
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
    
    .theme-${themeName} .sidebar-wrapper {
      background-color: ${variables['--sidebar-bg']} !important;
    }
  `;

  // Set the style element content
  styleElement.textContent = cssContent;

  console.log(`[ThemeInitializer] Applied theme variables with high priority for ${themeName}`);
}

/**
 * Verify theme application by checking computed styles
 */
function verifyThemeApplication(themeName: string, variables: Record<string, string>) {
  // Wait for next render cycle to check computed styles
  setTimeout(() => {
    // Check root element
    const rootStyles = getComputedStyle(document.documentElement);

    // Check a few key variables
    const themeBackground = rootStyles.getPropertyValue('--theme-bg').trim();
    const themeForeground = rootStyles.getPropertyValue('--theme-base').trim();

    console.log(`[ThemeInitializer] Verification - Theme ${themeName}:`);
    console.log(`  Expected background: ${variables['--theme-bg']}, Actual: ${themeBackground}`);
    console.log(`  Expected foreground: ${variables['--theme-base']}, Actual: ${themeForeground}`);

    // Check body class
    const hasThemeClass = document.body.classList.contains(`theme-${themeName}`);
    console.log(`  Body has theme-${themeName} class: ${hasThemeClass}`);

    // Alert if verification fails
    if (themeBackground !== variables['--theme-bg'] || !hasThemeClass) {
      console.warn(`[ThemeInitializer] Theme verification failed for ${themeName}!`);
    }
  }, 50);
}

/**
 * Get theme-specific CSS variables
 */
function getThemeVariables(themeName: string): Record<string, string> {
  const baseVariables = {
    '--theme-active': themeName,
  };

  // Theme-specific colors based on the ThemeConfigurations.ts definitions
  switch (themeName) {
    case 'dark':
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
    case 'light':
      return {
        ...baseVariables,
        '--theme-bg': '#ffffff',
        '--theme-base': '#333333',
        '--theme-string': '#0000ff',
        '--theme-keyword': '#ff0000',
        '--theme-primary': '#ff0000',
        '--theme-secondary': '#0066cc',
        '--border-color': 'rgba(0, 0, 0, 0.1)',
        '--sidebar-bg': '#f5f5f5',
      };
    case 'solarized':
      return {
        ...baseVariables,
        '--theme-bg': '#fdf6e3',
        '--theme-base': '#657b83',
        '--theme-string': '#2aa198',
        '--theme-keyword': '#cb4b16',
        '--theme-primary': '#cb4b16',
        '--theme-secondary': '#b58900',
        '--border-color': 'rgba(101, 123, 131, 0.1)',
        '--sidebar-bg': '#eee8d5',
      };
    case 'solarized-dark':
      return {
        ...baseVariables,
        '--theme-bg': '#002b36',
        '--theme-base': '#839496',
        '--theme-string': '#2aa198',
        '--theme-keyword': '#cb4b16',
        '--theme-primary': '#cb4b16',
        '--theme-secondary': '#b58900',
        '--border-color': 'rgba(147, 161, 161, 0.1)',
        '--sidebar-bg': '#073642',
      };
    case 'github-dark':
      return {
        ...baseVariables,
        '--theme-bg': '#0d1117',
        '--theme-base': '#c9d1d9',
        '--theme-string': '#a5d6ff',
        '--theme-keyword': '#ff7b72',
        '--theme-primary': '#ff7b72',
        '--theme-secondary': '#79c0ff',
        '--border-color': 'rgba(201, 209, 217, 0.1)',
        '--sidebar-bg': '#010409',
      };
    case 'monokai':
      return {
        ...baseVariables,
        '--theme-bg': '#272822',
        '--theme-base': '#f8f8f2',
        '--theme-string': '#e6db74',
        '--theme-keyword': '#f92672',
        '--theme-primary': '#f92672',
        '--theme-secondary': '#66d9ef',
        '--border-color': 'rgba(248, 248, 242, 0.1)',
        '--sidebar-bg': '#1e1f1c',
      };
    case 'dracula':
      return {
        ...baseVariables,
        '--theme-bg': '#282a36',
        '--theme-base': '#f8f8f2',
        '--theme-string': '#f1fa8c',
        '--theme-keyword': '#ff79c6',
        '--theme-primary': '#ff79c6',
        '--theme-secondary': '#8be9fd',
        '--border-color': 'rgba(248, 248, 242, 0.1)',
        '--sidebar-bg': '#21222c',
      };
    case 'nord':
      return {
        ...baseVariables,
        '--theme-bg': '#2e3440',
        '--theme-base': '#d8dee9',
        '--theme-string': '#a3be8c',
        '--theme-keyword': '#81a1c1',
        '--theme-primary': '#81a1c1',
        '--theme-secondary': '#88c0d0',
        '--border-color': 'rgba(216, 222, 233, 0.1)',
        '--sidebar-bg': '#242933',
      };
    case 'one-dark-pro':
      return {
        ...baseVariables,
        '--theme-bg': '#282c34',
        '--theme-base': '#abb2bf',
        '--theme-string': '#98c379',
        '--theme-keyword': '#c678dd',
        '--theme-primary': '#c678dd',
        '--theme-secondary': '#61afef',
        '--border-color': 'rgba(171, 178, 191, 0.1)',
        '--sidebar-bg': '#21252b',
      };
    case 'material-theme':
      return {
        ...baseVariables,
        '--theme-bg': '#263238',
        '--theme-base': '#eeffff',
        '--theme-string': '#c3e88d',
        '--theme-keyword': '#c792ea',
        '--theme-primary': '#c792ea',
        '--theme-secondary': '#89ddff',
        '--border-color': 'rgba(238, 255, 255, 0.1)',
        '--sidebar-bg': '#1c272b',
      };
    case 'night-owl':
      return {
        ...baseVariables,
        '--theme-bg': '#011627',
        '--theme-base': '#d6deeb',
        '--theme-string': '#addb67',
        '--theme-keyword': '#c792ea',
        '--theme-primary': '#c792ea',
        '--theme-secondary': '#7fdbca',
        '--border-color': 'rgba(214, 222, 235, 0.1)',
        '--sidebar-bg': '#001122',
      };
    case 'tokyo-night':
      return {
        ...baseVariables,
        '--theme-bg': '#1a1b26',
        '--theme-base': '#a9b1d6',
        '--theme-string': '#9ece6a',
        '--theme-keyword': '#bb9af7',
        '--theme-primary': '#bb9af7',
        '--theme-secondary': '#7aa2f7',
        '--border-color': 'rgba(169, 177, 214, 0.1)',
        '--sidebar-bg': '#16161e',
      };
    case 'winter-is-coming':
      return {
        ...baseVariables,
        '--theme-bg': '#1d2021',
        '--theme-base': '#cccccc',
        '--theme-string': '#608b4e',
        '--theme-keyword': '#569cd6',
        '--theme-primary': '#569cd6',
        '--theme-secondary': '#9cdcfe',
        '--border-color': 'rgba(204, 204, 204, 0.1)',
        '--sidebar-bg': '#151718',
      };
    case 'synthwave-84':
      return {
        ...baseVariables,
        '--theme-bg': '#262335',
        '--theme-base': '#ffffff',
        '--theme-string': '#ff8b39',
        '--theme-keyword': '#f97e72',
        '--theme-primary': '#f97e72',
        '--theme-secondary': '#ff7edb',
        '--border-color': 'rgba(255, 255, 255, 0.1)',
        '--sidebar-bg': '#1a1927',
      };
    case 'github-theme':
      return {
        ...baseVariables,
        '--theme-bg': '#ffffff',
        '--theme-base': '#24292e',
        '--theme-string': '#032f62',
        '--theme-keyword': '#d73a49',
        '--theme-primary': '#d73a49',
        '--theme-secondary': '#005cc5',
        '--border-color': 'rgba(36, 41, 46, 0.1)',
        '--sidebar-bg': '#f6f8fa',
      };
    case 'palenight':
      return {
        ...baseVariables,
        '--theme-bg': '#292d3e',
        '--theme-base': '#a6accd',
        '--theme-string': '#c3e88d',
        '--theme-keyword': '#c792ea',
        '--theme-primary': '#c792ea',
        '--theme-secondary': '#82aaff',
        '--border-color': 'rgba(166, 172, 205, 0.1)',
        '--sidebar-bg': '#202331',
      };
    case 'shades-of-purple':
      return {
        ...baseVariables,
        '--theme-bg': '#2D2B55',
        '--theme-base': '#A599E9',
        '--theme-string': '#A5FF90',
        '--theme-keyword': '#FF9D00',
        '--theme-primary': '#FF9D00',
        '--theme-secondary': '#9EFFFF',
        '--border-color': 'rgba(165, 153, 233, 0.1)',
        '--sidebar-bg': '#1E1E3F',
      };
    case 'city-lights':
      return {
        ...baseVariables,
        '--theme-bg': '#1d252c',
        '--theme-base': '#b7c5d3',
        '--theme-string': '#5ec4ff',
        '--theme-keyword': '#ebbf83',
        '--theme-primary': '#ebbf83',
        '--theme-secondary': '#5ec4ff',
        '--border-color': 'rgba(183, 197, 211, 0.1)',
        '--sidebar-bg': '#181e24',
      };
    case 'panda-syntax':
      return {
        ...baseVariables,
        '--theme-bg': '#292a2b',
        '--theme-base': '#e6e6e6',
        '--theme-string': '#19f9d8',
        '--theme-keyword': '#ff75b5',
        '--theme-primary': '#ff75b5',
        '--theme-secondary': '#6fc1ff',
        '--border-color': 'rgba(230, 230, 230, 0.1)',
        '--sidebar-bg': '#242526',
      };
    case 'catppuccin-mocha':
      return {
        ...baseVariables,
        '--theme-bg': '#1e1e2e',
        '--theme-base': '#cdd6f4',
        '--theme-string': '#a6e3a1',
        '--theme-keyword': '#cba6f7',
        '--theme-primary': '#cba6f7',
        '--theme-secondary': '#89b4fa',
        '--border-color': 'rgba(205, 214, 244, 0.1)',
        '--sidebar-bg': '#181825',
      };
    case 'rose-pine':
      return {
        ...baseVariables,
        '--theme-bg': '#191724',
        '--theme-base': '#e0def4',
        '--theme-string': '#ebbcba',
        '--theme-keyword': '#c4a7e7',
        '--theme-primary': '#c4a7e7',
        '--theme-secondary': '#9ccfd8',
        '--border-color': 'rgba(224, 222, 244, 0.1)',
        '--sidebar-bg': '#16141f',
      };
    case 'andromeda':
      return {
        ...baseVariables,
        '--theme-bg': '#23262e',
        '--theme-base': '#e5e5e5',
        '--theme-string': '#c3e88d',
        '--theme-keyword': '#ee6dff',
        '--theme-primary': '#ee6dff',
        '--theme-secondary': '#6dffee',
        '--border-color': 'rgba(229, 229, 229, 0.1)',
        '--sidebar-bg': '#1c1e24',
      };
    case 'nord-light':
      return {
        ...baseVariables,
        '--theme-bg': '#eceff4',
        '--theme-base': '#2e3440',
        '--theme-string': '#a3be8c',
        '--theme-keyword': '#5e81ac',
        '--theme-primary': '#5e81ac',
        '--theme-secondary': '#88c0d0',
        '--border-color': 'rgba(46, 52, 64, 0.1)',
        '--sidebar-bg': '#e5e9f0',
      };
    case 'nightingale':
      return {
        ...baseVariables,
        '--theme-bg': '#1f1f25',
        '--theme-base': '#eeeeee',
        '--theme-string': '#8aff80',
        '--theme-keyword': '#ff80bf',
        '--theme-primary': '#ff80bf',
        '--theme-secondary': '#80ffea',
        '--border-color': 'rgba(238, 238, 238, 0.1)',
        '--sidebar-bg': '#18181d',
      };
    case 'vscode-monokai-night':
      return {
        ...baseVariables,
        '--theme-bg': '#1a1a1a',
        '--theme-base': '#f8f8f2',
        '--theme-string': '#e6db74',
        '--theme-keyword': '#ff6188',
        '--theme-primary': '#ff6188',
        '--theme-secondary': '#78dce8',
        '--border-color': 'rgba(248, 248, 242, 0.1)',
        '--sidebar-bg': '#161616',
      };
    case 'noctis':
      return {
        ...baseVariables,
        '--theme-bg': '#1c2130',
        '--theme-base': '#d3dbe0',
        '--theme-string': '#c4dec4',
        '--theme-keyword': '#dfbfff',
        '--theme-primary': '#dfbfff',
        '--theme-secondary': '#5fb3a1',
        '--border-color': 'rgba(211, 219, 224, 0.1)',
        '--sidebar-bg': '#121722',
      };
    case 'cobalt2':
      return {
        ...baseVariables,
        '--theme-bg': '#193549',
        '--theme-base': '#ffffff',
        '--theme-string': '#3ad900',
        '--theme-keyword': '#ff9d00',
        '--theme-primary': '#ff9d00',
        '--theme-secondary': '#ffc600',
        '--border-color': 'rgba(255, 255, 255, 0.1)',
        '--sidebar-bg': '#15232d',
      };
    case 'ayu-mirage':
      return {
        ...baseVariables,
        '--theme-bg': '#1f2430',
        '--theme-base': '#cbccc6',
        '--theme-string': '#bae67e',
        '--theme-keyword': '#ffa759',
        '--theme-primary': '#ffa759',
        '--theme-secondary': '#5ccfe6',
        '--border-color': 'rgba(203, 204, 198, 0.1)',
        '--sidebar-bg': '#191e2a',
      };
    case 'gruvbox':
      return {
        ...baseVariables,
        '--theme-bg': '#282828',
        '--theme-base': '#ebdbb2',
        '--theme-string': '#b8bb26',
        '--theme-keyword': '#fb4934',
        '--theme-primary': '#fb4934',
        '--theme-secondary': '#83a598',
        '--border-color': 'rgba(235, 219, 178, 0.1)',
        '--sidebar-bg': '#1d2021',
      };
    case 'min-dark':
      return {
        ...baseVariables,
        '--theme-bg': '#1f1f1f',
        '--theme-base': '#e0e0e0',
        '--theme-string': '#9ccc65',
        '--theme-keyword': '#42a5f5',
        '--theme-primary': '#42a5f5',
        '--theme-secondary': '#66bb6a',
        '--border-color': 'rgba(224, 224, 224, 0.1)',
        '--sidebar-bg': '#191919',
      };
    case 'eva-theme':
      return {
        ...baseVariables,
        '--theme-bg': '#2a3343',
        '--theme-base': '#e0e0e0',
        '--theme-string': '#4cd964',
        '--theme-keyword': '#c594c5',
        '--theme-primary': '#c594c5',
        '--theme-secondary': '#56b6c2',
        '--border-color': 'rgba(224, 224, 224, 0.1)',
        '--sidebar-bg': '#21293a',
      };
    case 'github-copilot':
      return {
        ...baseVariables,
        '--theme-bg': '#0d1117',
        '--theme-base': '#c9d1d9',
        '--theme-string': '#a5d6ff',
        '--theme-keyword': '#ff7b72',
        '--theme-primary': '#ff7b72',
        '--theme-secondary': '#79c0ff',
        '--border-color': 'rgba(201, 209, 217, 0.1)',
        '--sidebar-bg': '#010409',
      };
    default:
      // Default fallback to dark theme
      console.warn(`[ThemeInitializer] No specific theme variables for "${themeName}", falling back to default dark theme`);
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
}

/**
 * Setup theme change listener for system theme changes
 */
export function setupThemeChangeListener() {
  // Watch for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  mediaQuery.addEventListener('change', (e) => {
    // Only update if using system theme
    const activeTheme = localStorage.getItem('activeTheme');
    if (activeTheme === 'system') {
      const newTheme = e.matches ? 'dark' : 'light';
      console.log('System theme changed to:', newTheme);

      // Re-initialize with the new theme
      initializeTheme();
    }
  });
} 
