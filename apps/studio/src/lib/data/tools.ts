import _ from 'lodash'
import { Dialect } from '@shared/lib/dialects/models'
import { friendlyJsonObject, stringifyWithBigInt } from '@/common/utils';
import rawLog from '@bksLogger';

const log = rawLog.scope('data/tools')

type JsonFriendly = string | boolean | number | null | JsonFriendly[] | Record<string, any>

function dec28bits(num: any): string {
  return ("00000000" + num.toString(2)).slice(-8);
}


export const Mutators = {

  resolveTabulatorMutator(dataType?: string, dialect?: Dialect): (v: any) => JsonFriendly {
    const mutator = this.resolveDataMutator(dataType, dialect, true)
    return (v: any) => mutator(v, true) // this cleans off the additional params
  },

  resolveDataMutator(dataType?: string, dialect?: Dialect, mutateJSON = false): (v: any, p?: boolean) => JsonFriendly {
    if (dataType && dataType === 'bit(1)') {
      return this.bit1Mutator.bind(this)
    }
    if (dataType && dataType.startsWith('bit')) {
      return this.bitMutator.bind(this, dialect)
    }
    if (dataType && dataType.startsWith('json') && mutateJSON) {
      return this.jsonMutator.bind(this)
    }
    return this.genericMutator.bind(this)
  },


  mutateRow(row: any[], dataTypes: string[] = [], preserveComplex = false, dialect?: Dialect): JsonFriendly[] {
    if (_.isObject(row)) {
      row = Object.values(row);
    }
    return row.map((item, index) => {
      const typ = dataTypes[index]
      const mutator = this.resolveDataMutator(typ, dialect)
      return mutator(item, preserveComplex)
    })
  },

  /**
   * Mutate database data to make it json-friendly
   * This is particularly useful for binary-type data
   * This is given
   * @param  {any} value
   * @returns JsonFriendly
   */
  genericMutator(value: any, preserveComplex = false): JsonFriendly {
    const mutate = Mutators.genericMutator
    if (ArrayBuffer.isView(value)) {
      return value
    }
    if (typeof value === 'bigint') return Number(value)
    if (_.isDate(value)) return value.toISOString()
    if (_.isArray(value)) return preserveComplex? value.map((v) => mutate(v, preserveComplex)) : stringifyWithBigInt(value)
    if (_.isObject(value)) return preserveComplex? _.mapValues(value, (v) => mutate(v, preserveComplex)) : stringifyWithBigInt(value)
    if (_.isBoolean(value)) return value
    return value
  },
  /**
   * Convert bit(1) data to a number for use in UIs and JSON.
   * Typically Bit1 data is like a true/false flag.
   * @param  {any} value
   * @returns JsonFriendly
   */
  bit1Mutator(value: any): JsonFriendly {
    if (!value) return 0

    // No need to convert if it's number
    if (_.isNumber(value)) return value

    return Number(value[0])
  },

  /**
   * Stringify bit data for use in json / UIs
   * @param {Dialect} dialect: The database dialect being used (must be first because the function is called via bind)
   * @param  {any} value
   * @returns JsonFriendly
   */
  bitMutator(dialect: Dialect, value: any): JsonFriendly {
    // value coming in is true/false (for sql) not 1/0, so for that export needs to be 0/1 for SQL export, maybe look in the sql export section and see what to do there instead
    // of futzing around in here too much? The goal is to keep the true/false as showing

    if (!value) return value

    if (dialect && dialect === 'sqlserver') return value

    // No need to convert if it's string
    if (_.isString(value)) return value

    const result = []
    for (let index = 0; index < value.length; index++) {
      result.push(value[index])
    }

    return `b'${result.map(d => dec28bits(d)).join("")}'`

  },

  /** Stringify json data for MySQL column */
  jsonMutator(value: any): JsonFriendly {
    if(!_.isObject(value)) return value;
    try {
      return friendlyJsonObject(value)
    } catch (e) {
      // the errors should be harmless. avoid throwing it cause it'll break our table.
      log.debug(`error stringifying json: ${e}`, value)
      return value
    }
  },
}
