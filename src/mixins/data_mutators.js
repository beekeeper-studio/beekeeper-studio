import _ from 'lodash'
export const NULL = '(NULL)'

function sanitizeHtml(value) {
  if (value) {
    var entityMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };

    return String(value).replace(/[&<>"'`=/]/g, function (s) {
      return entityMap[s];
    });
  } else {
    return value;
  }
}


export default {

  methods: {
    cellFormatter(cell) {
      if (_.isNil(cell.getValue())) {
        return '(NULL)'; //TODO: Make this configurable as soon we have a configuration window
      }

      let cellValue = cell.getValue().toString();
      cellValue = cellValue.replace(/\n/g, ' ↩ ');
      cellValue = sanitizeHtml(cellValue);
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
