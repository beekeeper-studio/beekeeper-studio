import _ from 'lodash'
export const NULL = '(NULL)'

function dec28bits(num) {
  return ("00000000" + num.toString(2)).slice(-8);
}


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
      // removing the <pre> will break selection / copy paste, see ResultTable
      const result = `<pre>${cellValue}</pre>`
      return result;
    },

    resolveDataMutator(dataType) {
      if (dataType && dataType === 'bit(1)') {
        return this.bit1Mutator
      }
      if (dataType && dataType.startsWith('bit')) {
        return this.bitMutator
      }
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
    bit1Mutator(value) {
      return value[0]
    },
    bitMutator(value) {
      const result = []
      for (let index = 0; index < value.length; index++) {
        result.push(value[index])
      }

      return `b'${result.map(d => dec28bits(d)).join("")}'`

    }
  }
}
