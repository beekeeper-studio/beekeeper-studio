import _ from 'lodash'

type JsonFriendly = string | boolean | number | null

function dec28bits(num: any): string {
  return ("00000000" + num.toString(2)).slice(-8);
}


export const Mutators = {
  resolveDataMutator(dataType?: string): (v: any) => JsonFriendly {
    if (dataType && dataType === 'bit(1)') {
      return this.bit1Mutator
    }
    if (dataType && dataType.startsWith('bit')) {
      return this.bitMutator
    }
    return this.genericMutator
  },


  mutateRow(row: any[], dataTypes: string[] = []): JsonFriendly[] {
    return row.map((item, index) => {
      const typ = dataTypes[index]
      const mutator = this.resolveDataMutator(typ)
      return mutator(item)
    })
  },

  
  /**
   * Mutate database data to make it json-friendly
   * This is particularly useful for binary-type data
   * @param  {any} value
   * @returns JsonFriendly
   */
  genericMutator(value: any): JsonFriendly {
    if (_.isBuffer(value)) return value.toString()
    if (_.isDate(value)) return value.toISOString()
    if (_.isObject(value)) return JSON.stringify(value)
    if (_.isArray(value)) return JSON.stringify(value)
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
    return value[0]
  },
  
  /**
   * Stringify bit data for use in json / UIs
   * @param  {any} value
   * @returns JsonFriendly
   */
  bitMutator(value: any): JsonFriendly {
    const result = []
    for (let index = 0; index < value.length; index++) {
      result.push(value[index])
    }

    return `b'${result.map(d => dec28bits(d)).join("")}'`

  }
}