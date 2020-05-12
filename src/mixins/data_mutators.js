import _ from 'lodash'
const NULL = '(NULL)'

export default {

  methods: {

    resolveDataMutator() {
      return this.genericMutator
    },

    genericMutator(value) {
      if (!value) return NULL
      if (_.isObject(value)) return JSON.stringify(value)
      if (_.isArray(value)) return JSON.stringify(value)
      return value
    },
  }
}