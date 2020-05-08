
const NULL = '[NULL]'

export default {

  methods: {

    resolveDataMutator(fieldType) {
      if (fieldType.toLowerCase().includes("json")) return this.jsonMutator
      return this.genericMutator
    },

    genericMutator(value) {
      if (!value) return NULL
      return value
    },
    jsonMutator(value) {
      if (!value) {
        return NULL
      }
      return JSON.stringify(value)
    }
  }
}