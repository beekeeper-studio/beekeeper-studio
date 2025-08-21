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

export default {
  niceString(value: any, truncate = false, binaryEncoding?: 'hex' | 'base64') {
    let cellValue = value.toString();
    if (_.isTypedArray(value)) {
      cellValue = typedArrayToString(value, binaryEncoding)
    } else if (_.isTypedArray(value?.buffer)) { // HACK: mongodb sends buffer this way
      cellValue = typedArrayToString(value.buffer, binaryEncoding)
    } else if (_.isArray(value) || _.isObject(value)) {
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

