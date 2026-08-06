import _ from 'lodash'
import { Mutators } from '../lib/data/tools'
import { TabulatorFormatterParams } from '@/common/tabulator'
import helpers, { escapeHtml } from '@shared/lib/tabulator'
export const NULL = '(NULL)'
import {CellComponent} from 'tabulator-tables'
import { dataTypeColorFamily, DataTypeColorFamily } from '@/common/dataTypeColors'

const dataTypeColorClasses: Record<DataTypeColorFamily, string> = {
  text: 'data-type-text',
  number: 'data-type-number',
  dateTime: 'data-type-date-time',
  boolean: 'data-type-boolean',
  binary: 'data-type-binary',
  other: 'data-type-other',
}

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
    cellTooltip(
      _event,
      cell: CellComponent
    ) {
      const params: TabulatorFormatterParams = cell.getColumn().getDefinition().formatterParams || {}
      let cellValue = cell.getValue()

      if (cellValue instanceof Uint8Array) {
        const binaryEncoding = params.binaryEncoding || 'hex'
        cellValue = `${_.truncate(this.niceString(cellValue, false, binaryEncoding), { length: 15 })} (as ${binaryEncoding} string)`
      } else if (
        !params?.fk &&
        !params?.isPK &&
        _.isInteger(Number(cellValue))
      ) {
        try {
          cellValue += ` (${new Date(Number(cellValue)).toISOString()} in unixtime)`
        } catch (e) {
          console.error(`${cellValue} cannot be converted to a date`)
        }
      }
      
      const nullValue = emptyResult(cellValue)
      return nullValue ? nullValue : escapeHtml(this.niceString(cellValue, true))
    },
    cellFormatter(
      cell: CellComponent,
      params: { fk?: any[], isPK?: boolean, fkOnClick?: (e: MouseEvent, cell: CellComponent) => void, binaryEncoding?: string, dataType?: string, dataTypeColors?: boolean } = {},
      onRendered: (func: () => void) => void
    ) {
      const classNames = []
      let cellValue = cell.getValue()
      const cellElement = cell.getElement()

      if (params.dataTypeColors) {
        cellElement.classList.remove(...Object.values(dataTypeColorClasses))
      }

      if (params.dataTypeColors && !_.isNil(cellValue) && !(_.isString(cellValue) && _.isEmpty(cellValue))) {
        cellElement.classList.add(dataTypeColorClasses[dataTypeColorFamily(params.dataType, cellValue)])
      }

      if (cellValue instanceof Uint8Array) {
        classNames.push('binary-type')
      }

      const nullValue = emptyResult(cellValue)
      if (nullValue) {
        return nullValue
      }
      cellValue = this.niceString(cellValue, true, params.binaryEncoding)
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
      }

      cell.getElement().classList.add(...classNames)

      return result;
    },
    yesNoFormatter: helpers.yesNoFormatter,
    ...Mutators
  }
}
