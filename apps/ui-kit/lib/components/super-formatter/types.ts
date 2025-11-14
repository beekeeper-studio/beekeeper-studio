export type SuperFormatterValueChangeEvent = CustomEvent<{
  value: string;
}>

export interface SuperFormatterEventMap extends HTMLElementEventMap{
  "bks-query-selection-change": SuperFormatterValueChangeEvent;
}
