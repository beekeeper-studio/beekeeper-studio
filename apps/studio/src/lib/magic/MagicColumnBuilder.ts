import { TableOrView } from '../db/models'
import { Magic } from './Magic'
import { MagicColumn } from './MagicColumn'
import magics from './magics'
import rawLog from '@bksLogger'
import _ from 'lodash';

const log = rawLog.scope('MagicColumnBuilder')

function magicFor(str: string, magicList: Magic[]) {
  return magicList.find((m) => m.initializers.includes(str.toLowerCase()))
}

const MagicColumnBuilder = {
  /// [name, format] => FormatMagic
  // [name, format, link] => LinkMagic
  // [name] => null
  findCurrentMagic(parts) {
    log.debug("finding magics for", parts)
    if (parts.length < 2) return null
    const topLevel = magicFor(parts[1], magics)
    if (parts[2] && topLevel.subMagics?.length) {
      const result = magicFor(parts[2], topLevel.subMagics) || topLevel
      return result
    } else {
      return topLevel
    }
  },

  build(columnName: string): MagicColumn | null {
    const parts = columnName.split("__")
    // eg website_url__format__link
    // eg customer_name__goto__customers__id
    if (parts.length < 2) return null

    const matching = this.findCurrentMagic(parts)
    return matching?.render(parts) || null
  },

  suggestWords(currentWord: string, dbTables: TableOrView[], defaultSchema: string): string[] {
    // name__format__ => [name, format]
    // name__ => [name]
    // name__format__link => [name, format, link]
    const parts = currentWord.split('__').filter((s) => !_.isEmpty(s))
    const lastPart = parts[parts.length - 1]
    const currentMagic = this.findCurrentMagic(parts)

    const prospectiveMagics = currentMagic ?
      currentMagic.subMagics || [] :
      magics

    const generatedAutocompleteOptions = currentMagic?.genAutocompleteHints?.(
      currentWord, dbTables, defaultSchema
    ) || []
    const paramOptions = currentMagic?.autocompleteHints || []
    const results = [
      ...prospectiveMagics.map((m) => m.initializers[0]),
      ...paramOptions,
      ...generatedAutocompleteOptions
    ]
    if (!currentWord.endsWith('__')) {
      return results.filter((o) => o.startsWith(lastPart))
    } else {
      return results
    }
  }
}

export default MagicColumnBuilder
