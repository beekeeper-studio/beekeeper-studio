import _ from 'lodash'
import { Dialect } from '@shared/lib/dialects/models'
type JsonFriendly = string | boolean | number | null | JsonFriendly[] | object

function dec28bits(num: any): string {
  return ("00000000" + num.toString(2)).slice(-8);
}


export const Mutators = {

  resolveTabulatorMutator(dataType?: string, dialect?: Dialect): (v: any) => JsonFriendly {
    const mutator = this.resolveDataMutator(dataType, dialect)
    return (v: any) => mutator(v) // this cleans off the additional params
  },

  resolveDataMutator(dataType?: string, dialect?: Dialect): (v: any, p?: boolean) => JsonFriendly {
    if (dataType && dataType === 'bit(1)') {
      return this.bit1Mutator.bind(this)
    }
    if (dataType && dataType.startsWith('bit')) {
      return this.bitMutator.bind(this, dialect)
    }
    return this.genericMutator.bind(this)
  },


  mutateRow(row: any[], dataTypes: string[] = [], preserveComplex: boolean = false, dialect?: Dialect): JsonFriendly[] {
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
  genericMutator(value: any, preserveComplex: boolean = false): JsonFriendly {
    const mutate = Mutators.genericMutator
    if (_.isBuffer(value)) return value.toString('hex')
    if (_.isDate(value)) return value.toISOString()
    if (_.isArray(value)) return preserveComplex? value.map((v) => mutate(v, preserveComplex)) : JSON.stringify(value)
    if (_.isObject(value)) return preserveComplex? _.mapValues(value, (v) => mutate(v, preserveComplex)) : JSON.stringify(value)
    if (_.isBoolean(value)) return value
    return value
  },
  /**
   * Stringify bit(1) data for use in UIs and JSON.
   * Typically Bit1 data is like a true/false flag.
   * @param  {any} value
   * @returns JsonFriendly
   */
  bit1Mutator(value: any): JsonFriendly {
    if (!value) return 0
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
  
    if (dialect && dialect === 'sqlserver') return value
    
    const result = []
    for (let index = 0; index < value.length; index++) {
      result.push(value[index])
    }

    return `b'${result.map(d => dec28bits(d)).join("")}'`

  }
}
