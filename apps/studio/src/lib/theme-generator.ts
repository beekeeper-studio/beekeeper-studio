import { ParsedTheme } from './theme-parser';

/**
 * Generate CSS for a parsed theme
 */
export function generateThemeCSS(theme: ParsedTheme): string {
  let css = `/* Generated theme: ${theme.name} */\n`;

  css += 'body.theme-custom {\n';

  // Add CSS variables
  css += '  :root {\n';
  for (const [variable, value] of Object.entries(theme.beekeeperVariables)) {
    css += `    ${variable}: ${value};\n`;
  }
  css += '  }\n';

  // Add CodeMirror theme mappings
  css += '  .CodeMirror {\n';
  if (theme.beekeeperVariables['--theme-bg']) {
    css += `    background-color: ${theme.beekeeperVariables['--theme-bg']};\n`;
  }
  if (theme.beekeeperVariables['--theme-base']) {
    css += `    color: ${theme.beekeeperVariables['--theme-base']};\n`;
  }
  css += '  }\n';

  // Add sidebar styles
  if (theme.beekeeperVariables['--sidebar-bg']) {
    css += '  #sidebar {\n';
    css += `    background-color: ${theme.beekeeperVariables['--sidebar-bg']};\n`;
    css += '  }\n';
  }

  // Add button styles
  if (theme.beekeeperVariables['--theme-primary']) {
    css += '  .btn-primary {\n';
    css += `    background: ${theme.beekeeperVariables['--theme-primary']};\n`;
    css += '  }\n';
  }

  css += '}\n';

  return css;
}
