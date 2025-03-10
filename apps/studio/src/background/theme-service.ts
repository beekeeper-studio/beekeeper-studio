interface ThemeData {
  name: string;
  path: string;
  type: 'vscode' | 'textmate';
  css: string;
}

// In-memory cache of themes
const themeCache: Record<string, ThemeData> = {};

export async function getThemeByName(name: string) {
  // Implementation to get theme data
  return themeCache[name] || null;
}
