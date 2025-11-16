
type CaseOption = 'preserve' | 'upper' | 'lower';
export type SuperFormatterValueChangeEvent = CustomEvent<{
  value: string;
}>

export type SuperFormatterDelete = {
  id: string
}

export type SuperFormatterFormatterOptions = {
  id?: number;
  tabWidth: number;
  useTabs: boolean;

  keywordCase: CaseOption;
  dataTypeCase: CaseOption;
  functionCase: CaseOption;

  logicalOperatorNewline: 'before' | 'after';
  expressionWidth: number;
  linesBetweenQueries: number;
  denseOperators: boolean;
  newlineBeforeSemicolon: boolean;
}

export type SuperFormatterCreate = {
  name: string;
  config: SuperFormatterFormatterOptions;
}

export type SuperFormatterUpdate = {
  id: number;
  config: SuperFormatterFormatterOptions;
}

export interface SuperFormatterEventMap extends HTMLElementEventMap{
  "bks-query-selection-change": SuperFormatterValueChangeEvent
  "bks-delete-preset": SuperFormatterDelete
  "bks-apply-preset": SuperFormatterFormatterOptions
  "bks-create-preset": SuperFormatterCreate
  "bks-save-preset": SuperFormatterUpdate
}