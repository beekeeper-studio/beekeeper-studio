import _ from 'lodash'
import { Mutators } from '../lib/data/tools'
import helpers, { escapeHtml } from '@shared/lib/tabulator'
export const NULL = '(NULL)'
import {CellComponent} from 'tabulator-tables'

export function buildNullValue(text: string) {
  return `<span class="null-value">(${escapeHtml(text)})</span>`
}


export function emptyResult(value: any) {
  if (_.isNil(value)) {
    return buildNullValue('NULL')
  }
  if (_.isString(value) && _.isEmpty(value)) {
    return buildNullValue('EMPTY')
  }
  if (_.isArray(value) && value.length === 0) {
    return buildNullValue('NULL')
  }

  return null
}

export function buildFormatterWithTooltip(cellValue: string, tooltip: string, icon?: string) {
  if (!icon) {
    return `<div class="cell-link-wrapper" title="${escapeHtml(tooltip)}">${escapeHtml(cellValue)}</div>`
  }

  return `<div class="cell-link-wrapper">${escapeHtml(cellValue)}<i class="material-icons fk-link" title="${escapeHtml(tooltip)}">${escapeHtml(icon)}</i></div>`
}

export default {

  methods: {
    niceString: helpers.niceString,
    pillFormatter(cell: CellComponent) {
      const nullValue = emptyResult(cell.getValue())
      if (nullValue) {
        return ''
      }

      const cellValue = cell.getValue()
      return cellValue.map(cv => `<span class="mapper-pill">${cv}</span>`).join('')
    },
    cellTooltip(_event, cell: CellComponent) {
      let cellValue = cell.getValue()
      if (cellValue instanceof Uint8Array) {
        cellValue = `${_.truncate(cellValue.toString(), { length: 15 })} (as hex string)`
      }
      const nullValue = emptyResult(cellValue)
      return nullValue ? nullValue : escapeHtml(this.niceString(cellValue, true))
    },
    cellFormatter(
      cell: CellComponent,
      params: { fk?: any[], isPK?: boolean, fkOnClick?: (e: MouseEvent, cell: CellComponent) => void },
      onRendered: (func: () => void) => void
    ) {
      const classNames = []
      let htmlPrefix = ''
      let cellValue = cell.getValue()

      if (cellValue instanceof Uint8Array) {
        classNames.push('binary-type')
      }

      const nullValue = emptyResult(cellValue)
      if (nullValue) {
        return nullValue
      }
      cellValue = this.niceString(cellValue, true)
      cellValue = cellValue.replace(/\n/g, ' ↩ ');

      // removing the <pre> will break selection / copy paste, see ResultTable
      let result = `<pre>${escapeHtml(cellValue)}</pre>`
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
          !classNames.includes('binary-type') &&
          _.isInteger(Number(cellValue))
        ) {
        try {
          tooltip = `${new Date(Number(cellValue)).toISOString()} in unixtime`
          result = buildFormatterWithTooltip(cellValue, tooltip)
        } catch (e) {
          console.error(`${cellValue} cannot be converted to a date`)
        }
    }

      cell.getElement().classList.add(...classNames)

      return htmlPrefix + result;
    },
    yesNoFormatter: helpers.yesNoFormatter,
    ...Mutators
  }
}
