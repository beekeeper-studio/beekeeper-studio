import _ from 'lodash'
export const NULL = '(NULL)'

export default {

  methods: {

    resolveDataMutator() {
      return this.genericMutator
    },

    genericMutator(value) {
      // if (_.isNil(value)) return NULL
      if (_.isBuffer(value)) return value.toString()
      if (_.isDate(value)) return value.toISOString()
      if (_.isObject(value)) return JSON.stringify(value)
      if (_.isArray(value)) return JSON.stringify(value)
      if (_.isBoolean(value)) return value
      return value
    },
  }
}
