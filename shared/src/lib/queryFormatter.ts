export const FORMAT_OPTIONS = {
  tabWidth: {
    label: "Tab Width",
    desc: "Number of spaces per indentation",
    type: "number",
    default: 2,
  },
  useTabs: {
    label: "Use Tabs",
    desc: "Use tabs instead of spaces",
    type: "boolean",
    default: false,
  },
  keywordCase: {
    label: "Keyword Case",
    desc: "Convert keywords to upper or lower case",
    type: "options",
    options: ["preserve", "upper", "lower"],
    default: "preserve",
  },
  dataTypeCase: {
    label: "Data Type Case",
    desc: "Convert data types to upper or lower case",
    type: "options",
    options: ["preserve", "upper", "lower"],
    default: "preserve",
  },
  functionCase: {
    label: "Function Case",
    desc: "Convert functions to upper or lower case",
    type: "options",
    options: ["preserve", "upper", "lower"],
    default: "preserve",
  },
  identifierCase: {
    label: "Identifier Case",
    desc: "Convert identifiers to upper or lower case",
    type: "options",
    options: ["preserve", "upper", "lower"],
    default: "preserve",
  },
  logicalOperatorNewline: {
    label: "Logical Operator Newline",
    desc: "Decide newline placement before or after logical operators (AND, OR, XOR)",
    type: "options",
    options: ["before", "after"],
    default: "before",
  },
  expressionWidth: {
    label: "Expression Width",
    desc: "Maximum number of characters in parenthesized expressions to be kept on single line",
    type: "number",
    default: 50,
  },
  linesBetweenQueries: {
    label: "Lines Between Queries",
    desc: "How many newlines to insert between queries",
    type: "number",
    default: 1,
  },
  denseOperators: {
    label: "Dense Operators",
    desc: "Pack operators densely without spaces.",
    type: "boolean",
    default: false,
  },
  newlineBeforeSemicolon: {
    label: "Newline Before Semicolon",
    desc: "Place semicolon on separate line.",
    type: "boolean",
    default: false,
  },
} as const;

export const DEFAULT_FORMAT_PRESET = Object.keys(FORMAT_OPTIONS).reduce(
  (obj, option) => ({ ...obj, [option]: FORMAT_OPTIONS[option].default }),
  {}
) as QueryFormatPreset;

export const DEFAULT_FORMAT_PRESET_NAME = "None";

export type QueryFormatPreset = {
  [K in keyof typeof FORMAT_OPTIONS]: typeof FORMAT_OPTIONS[K]["type"] extends "boolean"
  ? boolean
  : typeof FORMAT_OPTIONS[K]["type"] extends "number"
  ? number
  : string;
};
