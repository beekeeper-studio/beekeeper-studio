import { TableOrView } from '../db/models';
import { MagicColumn } from './MagicColumn';

// takes a column name split, and returns a MagicColumn
// eg: ['name', 'format', 'link'] => LinkMagic
export interface Magic {
  name: string;
  initializers: string[];
  render(args: string[]): MagicColumn | null;
  subMagics?: Magic[]
  autocompleteHints?: string[]
  genAutocompleteHints?: (currentWord: string, tables: TableOrView[], defaultSchema?: string) => string[]
}
