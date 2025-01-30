import { CellComponent } from 'tabulator-tables';
import { Magic } from '../../Magic';
import { MagicColumn } from '../../MagicColumn';
import store from '@/store'
import { UserProvidedEnum } from '@/lib/UserProvidedEnum';
import _ from 'lodash';

function enumFormatter(cell: CellComponent, params: any, _onRendered): string {
  const value = (params.userEnum as UserProvidedEnum).findMatch(cell.getValue());
  return value ? value : cell.getValue();
}

const EnumMagic: Magic = {
  name: 'EnumMagic',
  initializers: ['enum'],
  render: function (args: string[]): MagicColumn {
    const userEnum = store.getters['userEnums/enums'].find((obj: UserProvidedEnum) => obj.name === args[3]);
    return {
      title: args[0],
      formatter: enumFormatter, 
      formatterParams: {
        userEnum
      }
    }
  },
  // This function generates an autocomplete list of all of the User Defined Enums that are available.
  // @param word is the name of the column that the user is specifying ({columnName}__format__enum__{enumName})
  // @returns a filtered list of all of the matching enum names.
  genAutocompleteHints(word): string[] {
    const args = word.split('__').filter((s) => !_.isEmpty(s));
    const newPrompt = word.endsWith('__');
    const incompleteWord = newPrompt ? null : args[args.length - 1];
    
    let result: string[] = [];
    if (args.length < 3) return []
    if (args.length === 3 || (args.length === 4 && incompleteWord)) {
      result = store.getters['userEnums/enums'].map((e) => e.name);
    }
    return incompleteWord ? result.filter((w) => w.startsWith(incompleteWord) && w !== incompleteWord) : result;
  }
};

export default EnumMagic;
