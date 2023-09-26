import _ from 'lodash'
import { Mutators } from '../lib/data/tools'
import helpers from '@shared/lib/tabulator'
export const NULL = '(NULL)'
import {Tabulator} from 'tabulator-tables'

const htmlMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
};

export function escapeHtml(text: string): string | null {
  if (!text) return null
  return text.replace(/[&<>"']/g, function (m) { return htmlMap[m]; });
}

function emptyResult(value: any) {
  const nullValue = '<span class="null-value">(NULL)</span>'
  if (_.isNil(value)) {
    return nullValue
  }
  if (_.isString(value) && _.isEmpty(value)) {
    return '<span class="null-value">(EMPTY)</span>'
  }

  if (_.isArray(value) && value.length === 0) {
    return nullValue
  }

  return null
}

export default {

  methods: {


    niceString(value: any, truncate = false) {

      let cellValue = value.toString();
      if (_.isArray(value)) {
        cellValue = value.map((v) => v.toString()).join(", ")
      }
      return truncate ? _.truncate(cellValue, { length: 256 }) : cellValue
    },

    cellTooltip(_event, cell: Tabulator.CellComponent) {
      const nullValue = emptyResult(cell.getValue())
      return nullValue ? nullValue : escapeHtml(this.niceString(cell.getValue(), true))
    },
    cellFormatter(cell: Tabulator.CellComponent) {
      const nullValue = emptyResult(cell.getValue())
      if (nullValue) {
        return nullValue
      }
      let cellValue = this.niceString(cell.getValue(), true)
      cellValue = cellValue.replace(/\n/g, ' ↩ ');
      cellValue = escapeHtml(cellValue);
      // removing the <pre> will break selection / copy paste, see ResultTable
      const result = `<pre>${cellValue}</pre>`
      return result;
    },
    yesNoFormatter: helpers.yesNoFormatter,
    ...Mutators
  }
}
