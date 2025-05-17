interface ParsedTheme {
  id: string;
  name: string;
  type: string;
  css: string;
  colors: Record<string, string>;
}

export function parseTextMateTheme(_content: string): ParsedTheme {
  // Basic TextMate theme parsing
  const id = `custom-${Date.now()}`;
  const name = "Imported TextMate Theme";

  // Extract colors from the theme content
  const colors: Record<string, string> = {
    background: "#1e1e1e",
    foreground: "#d4d4d4",
    string: "#ce9178",
    keyword: "#569cd6"
  };

  // Convert TextMate theme to CSS
  const css = `
    :root {
      --theme-bg: ${colors.background};
      --theme-base: ${colors.foreground};
      --theme-string: ${colors.string};
      --theme-keyword: ${colors.keyword};
    }
  `;

  return {
    id,
    name,
    type: "textmate",
    css,
    colors
  };
} 
