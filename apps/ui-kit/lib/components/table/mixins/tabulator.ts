import _ from 'lodash'
import {CellComponent} from 'tabulator-tables'


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

export interface YesNoParams {
  allowEmpty?: boolean
  falseEmpty?: boolean
}


function yesNoResult(value: boolean) {
  const result = value ? 'YES' : 'NO'
  return `<div class="yesno-select">${result}</div>`
}

export default {
  niceString(value: any, truncate = false) {
    let cellValue = value.toString();
    if(_.isArray(value) || (_.isObject(value) && !ArrayBuffer.isView(value))) {
      cellValue = JSON.stringify(value)
    }
    return truncate ? _.truncate(cellValue, { length: 256 }) : cellValue
  },
  cellFormatter(cell: CellComponent) {
    if (_.isNil(cell.getValue())) {
      return '<span class="null-value">(NULL)</span>'
    }

    if(_.isEmpty(cell.getValue())) {
      return '<span class="empty-value">(EMPTY)</span>'
    }

    let cellValue = cell.getValue().toString();
    cellValue = cellValue.replace(/\n/g, ' ↩ ');
    cellValue = escapeHtml(cellValue);
    // removing the <pre> will break selection / copy paste, see ResultTable
    const result = `<pre>${cellValue}</pre>`
    return result;
  },
  isDateTime(dataType: string|null) {
    return dataType?.search(/(date|time)/i) > -1 && dataType?.toLowerCase() !== 'daterange'
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

