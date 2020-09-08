import _ from 'lodash'
export const NULL = '(NULL)'

export default {

  methods: {
    cellFormatter(cell) {
      if (_.isNil(cell.getValue())) {
        return '(NULL)'; //TODO: Make this configurable as soon we have a configuration window
      }

      let cellValue = cell.getValue().toString();
      cellValue = cellValue.replace(/\n/g, ' ↩ ');
      return cellValue;
    },

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
