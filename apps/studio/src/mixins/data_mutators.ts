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

function buildFormatterWithTooltip(cellValue: string, tooltip: string, icon: string) {
  return `<div class="cell-link-wrapper">${cellValue}<i class="material-icons fk-link" title="${tooltip}">${icon}</i></div>`
}

export default {

  methods: {
    niceString: helpers.niceString,
    cellTooltip(_event, cell: Tabulator.CellComponent) {
      const nullValue = emptyResult(cell.getValue())
      return nullValue ? nullValue : escapeHtml(this.niceString(cell.getValue(), true))
    },
    cellFormatter(
      cell: Tabulator.CellComponent,
      params: { fk?: any[], isPK?: boolean, fkOnClick?: (e: MouseEvent, cell: Tabulator.CellComponent) => void },
      onRendered: (func: () => void) => void
    ) {
      const nullValue = emptyResult(cell.getValue())
      if (nullValue) {
        return nullValue
      }
      let cellValue = this.niceString(cell.getValue(), true)
      cellValue = cellValue.replace(/\n/g, ' ↩ ');
      cellValue = escapeHtml(cellValue);
      
      // removing the <pre> will break selection / copy paste, see ResultTable
      let result = `<pre>${cellValue}</pre>`
      let tooltip = ''

      if (params?.fk) {
        if (params.fk.length === 1) tooltip = `View record in ${params.fk[0].toTable}`
        else tooltip = `View records in ${(params.fk.map(item => item.toTable).join(', ') as string).replace(/, (?![\s\S]*, )/, ', or ')}`

        result = buildFormatterWithTooltip(cellValue, tooltip, 'launch')

        onRendered(() => {
          const fkLink = cell.getElement().querySelector('.fk-link') as HTMLElement
          fkLink.onclick = (e) => params.fkOnClick(e, cell);
        })
      } else if (
          params?.isPK != null &&
          !params.isPK &&
          _.isInteger(Number(cellValue)) &&
          _.inRange(Number(cellValue), 946598400000, 8640000000000000) // epoch time from 1999-12-31 (party like it's 1999), more info: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#description
        ) {
        tooltip = new Date(Number(cellValue)).toISOString()
        result = buildFormatterWithTooltip(cellValue, tooltip, 'timelapse')
    }

      return result;
    },
    yesNoFormatter: helpers.yesNoFormatter,
    ...Mutators
  }
}
