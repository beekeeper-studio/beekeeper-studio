/**
 * Initializes and applies the current theme on application start
 */
export async function initializeTheme() {
  try {
    // Get active theme from localStorage or default to 'dark'
    let activeTheme = localStorage.getItem('activeTheme') || 'dark';

    console.log('Initializing theme:', activeTheme);

    // For system theme, check user preference
    if (activeTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      activeTheme = prefersDark ? 'dark' : 'light';
      console.log('System theme preference detected:', activeTheme);
    }

    // Apply theme class directly and forcefully
    document.body.className = document.body.className
      .replace(/theme-[a-zA-Z0-9-_]+/g, '')
      .trim() + ` theme-${activeTheme}`;

    // Also apply to document element for CSS variable inheritance
    document.documentElement.className = document.documentElement.className
      .replace(/theme-[a-zA-Z0-9-_]+/g, '')
      .trim() + ` theme-${activeTheme}`;

    console.log('Applied theme class to body:', document.body.className);

    // Set theme-specific CSS variables based on the active theme
    const themeVariables = getThemeVariables(activeTheme);

    // Apply variables directly to root and body
    Object.entries(themeVariables).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
      document.body.style.setProperty(key, value);
    });

    // Ensure the theme variables are applied
    document.documentElement.style.setProperty('--theme-active', activeTheme);

    // If we're in Electron, use the IPC to get theme CSS
    if (window.electron && window.electron.ipcRenderer) {
      try {
        // Request theme application
        await (window.electron.ipcRenderer as any).invoke('themes/apply', { name: activeTheme });
        console.log('Theme applied via IPC');
      } catch (err) {
        console.error('Error applying theme via IPC:', err);
      }
    }

    return activeTheme;
  } catch (error) {
    console.error('Error initializing theme:', error);

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
    default:
      // Default fallback to dark theme
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
