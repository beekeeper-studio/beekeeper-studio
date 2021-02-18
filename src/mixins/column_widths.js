
const bigColumns = [
  'text', 'json', 'xml', 'bytea'
]

export default {

  methods: {
    columnWidth(type) {
      if (bigColumns.find(c => type.startsWith(c))) return 300
      return undefined
    },

    maxWidth() {
      return 500
    }
  }
}