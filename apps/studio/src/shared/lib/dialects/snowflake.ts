import { defaultEscapeString, defaultWrapLiteral, DialectData } from "./models";

export const SnowflakeData: DialectData = {
  sqlLabel: 'SQL',
  wrapIdentifier: (value: string): string => {
    if (!value || value === '*') return value;
    return `"${value.replaceAll(/"/g, '""')}"`;
  },
  wrapLiteral: defaultWrapLiteral,
  escapeString: defaultEscapeString,
  disabledFeatures: {
    shell: true,
    indexes: true, // for now, only available on hybrid tables which are paywalled
    alter: {
      indexes: true,
      reorderColumn: true,
      alterDefault: true
    },
    triggers: true,
    backup: true,
    addDatabase: true
  }
}
