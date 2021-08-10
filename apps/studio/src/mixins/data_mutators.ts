import _ from 'lodash'
import { Mutators } from '../lib/data/tools'
import Purify from 'dompurify'
import helpers from '@shared/lib/tabulator'
export const NULL = '(NULL)'
import Tabulator from 'tabulator-tables'


function sanitizeHtml(value) {
  if (!value) return null
  return Purify.sanitize(value)
}


export default {

  methods: {
    cellFormatter(cell: Tabulator.CellComponent) {

      const nullValue = '<span class="null-value">(NULL)</span>'

      if (_.isNil(cell.getValue())) {
        return nullValue
      }
      if (_.isString(cell.getValue()) && _.isEmpty(cell.getValue())) {
        return '<span class="null-value">(EMPTY)</span>'
      }

      if (_.isArray(cell.getValue()) && cell.getValue().length === 0) {
        return nullValue
      }

      let cellValue = cell.getValue().toString();
      if (_.isArray(cell.getValue())) {
        cellValue = cell.getValue().map((v) => v.toString()).join(", ")
      }
      cellValue = cellValue.replace(/\n/g, ' ↩ ');
      cellValue = sanitizeHtml(cellValue);
      // removing the <pre> will break selection / copy paste, see ResultTable
      const result = `<pre>${cellValue}</pre>`
      return result;
    },
    yesNoFormatter: helpers.yesNoFormatter,
    ...Mutators
  }
}
