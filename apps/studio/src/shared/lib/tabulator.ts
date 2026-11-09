import { typedArrayToString } from '@/common/utils';
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


interface KeyData {
  isComposite: boolean;
  [key: string]: any;
}

export interface FormatterParams {
  fk: KeyData[] | false;
  fkOnClick: false | ((_e: Event, cell: { [key: string]: any }) => void);
  isPK: boolean;
  binaryEncoding: string; // or boolean, depending on actual type
}

export interface YesNoParams {
  allowEmpty?: boolean
  falseEmpty?: boolean
}


function yesNoResult(value: boolean) {
  const result = value ? 'YES' : 'NO'
  return `<div class="yesno-select">${result}</div>`
}

export const MAX_CELL_CHARS = 256;

export function niceString(value: any, truncate = false, binaryEncoding?: 'hex' | 'base64') {
  // Convert a little past the cell budget so an over-long binary still trips
  // _.truncate below and keeps its `...` cue, the same as a long string.
  const maxChars = truncate ? MAX_CELL_CHARS + 4 : undefined
  let cellValue: string
  if (_.isTypedArray(value)) {
    // NOTE: typed arrays must be converted via typedArrayToString. Calling
    // value.toString() joins every element into a huge decimal string.
    cellValue = typedArrayToString(value, binaryEncoding, maxChars)
  } else if (_.isTypedArray(value?.buffer)) { // HACK: mongodb sends buffer this way
    cellValue = typedArrayToString(value.buffer, binaryEncoding, maxChars)
  } else if (_.isArray(value) || _.isObject(value)) {
    cellValue = JSON.stringify(value)
  } else {
    cellValue = value.toString()
  }
  return truncate ? _.truncate(cellValue, { length: MAX_CELL_CHARS }) : cellValue
}

export default {
  niceString,
  cellFormatter(cell: CellComponent) {
    const value = cell.getValue()
    if (_.isNil(value)) {
      return '<span class="null-value">(NULL)</span>'
    }

    if(_.isEmpty(value)) {
      return '<span class="empty-value">(EMPTY)</span>'
    }

    let cellValue = niceString(value, true)
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

