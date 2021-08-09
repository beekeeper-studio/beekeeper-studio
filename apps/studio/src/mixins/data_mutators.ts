import _ from 'lodash'
import { Mutators } from '../lib/data/tools'
import helpers from '@shared/lib/tabulator'
export const NULL = '(NULL)'
import Tabulator from 'tabulator-tables'

const htmlMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
};

function escapeHtml(text: string): string | null {
  if (!text) return null
  return text.replace(/[&<>"']/g, function (m) { return htmlMap[m]; });
}

export default {

  methods: {
    cellFormatter(cell: Tabulator.CellComponent) {
      if (_.isNil(cell.getValue())) {
        return '<span class="null-value">(NULL)</span>'
      }
      if (_.isString(cell.getValue()) && _.isEmpty(cell.getValue())) {
        return '<span class="null-value">(EMPTY)</span>'
      }

      let cellValue = cell.getValue().toString();
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
