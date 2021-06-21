import Purify from 'dompurify'
import _ from 'lodash'
import Tabulator from 'tabulator-tables'

function sanitizeHtml(value) {
  if (!value) return null
  return Purify.sanitize(value)
}

export interface YesNoParams {
  allowEmpty?: boolean
  falseEmpty?: boolean
}


function yesNoResult(value: boolean) {
  const result = value ? 'YES' : 'NO'
  return `<div class="yesno-select">${result}</div>`
}

export default {
  cellFormatter(cell: Tabulator.CellComponent) {
    if (_.isNil(cell.getValue())) {
      return '<span class="null-value">(NULL)</span>'
    }

    if(_.isEmpty(cell.getValue())) {
      return '<span class="empty-value">(EMPTY)</span>'
    }

    let cellValue = cell.getValue().toString();
    cellValue = cellValue.replace(/\n/g, ' ↩ ');
    cellValue = sanitizeHtml(cellValue);
    // removing the <pre> will break selection / copy paste, see ResultTable
    const result = `<pre>${cellValue}</pre>`
    return result;
  },
  yesNoFormatter(cell: any, params?: YesNoParams): string {

    if (cell.getValue() === true) {
      return yesNoResult(true)
    } else if (cell.getValue() === false) {
      if (params.falseEmpty) return ''
      return yesNoResult(false)
    }

    if (params?.allowEmpty && _.isNil(cell.getValue())) {
      return ''
    } else {
      return yesNoResult(false)
    }
  }
}

