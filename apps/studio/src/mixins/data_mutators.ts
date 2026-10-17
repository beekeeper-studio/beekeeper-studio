import _ from 'lodash'
import { Mutators } from '../lib/data/tools'
import { TabulatorFormatterParams } from '@/common/tabulator'
import helpers, { escapeHtml } from '@shared/lib/tabulator'
import { REFERENCED_BY_ICON, referencedByTooltip } from '@/lib/data/referencedBy'
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

  return null
}

export interface CellLink {
  icon: string
  tooltip: string
  className?: string
}

export function buildFormatterWithLinks(cellValue: string, links: CellLink[]) {
  const icons = links.map(({ icon, tooltip, className }) => {
    const classes = ['material-icons', 'fk-link', className].filter(Boolean).join(' ')
    return `<i class="${classes}" title="${escapeHtml(tooltip)}">${escapeHtml(icon)}</i>`
  }).join('')
  const wrapperClass = links.length > 1 ? 'cell-link-wrapper has-many-links' : 'cell-link-wrapper'

  return `<div class="${wrapperClass}">${escapeHtml(cellValue)}${icons}</div>`
}

export function buildFormatterWithTooltip(cellValue: string, tooltip: string, icon?: string) {
  if (!icon) {
    return `<div class="cell-link-wrapper" title="${escapeHtml(tooltip)}">${escapeHtml(cellValue)}</div>`
  }

  return buildFormatterWithLinks(cellValue, [{ icon, tooltip }])
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
        cellValue = `${_.truncate(this.niceString(cellValue, true, binaryEncoding), { length: 15 })} (as ${binaryEncoding} string)`
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
      params: TabulatorFormatterParams = {},
      onRendered: (func: () => void) => void
    ) {
      const classNames = []
      let cellValue = cell.getValue()

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
      const links: CellLink[] = []

      if (params?.fk) {
        let tooltip = ''
        if (params.fk.length === 1) tooltip = `View record in ${params.fk[0].toTable}`
        else tooltip = `View records in ${(params.fk.map(item => item.toTable).join(', ') as string).replace(/, (?![\s\S]*, )/, ', or ')}`
        links.push({ icon: 'launch', tooltip })
      }

      // loaded after the table renders, so read them at format time
      const referencedBy = params?.referencedBy?.() ?? []
      if (referencedBy.length) {
        links.push({
          icon: REFERENCED_BY_ICON,
          tooltip: referencedByTooltip(referencedBy),
          className: 'referenced-by-link',
        })
      }

      if (links.length) {
        result = buildFormatterWithLinks(cellValue, links)

        onRendered(() => {
          const element = cell.getElement()
          const fkLink = element.querySelector('.fk-link:not(.referenced-by-link)') as HTMLElement
          if (fkLink) fkLink.onclick = (e) => params.fkOnClick(e, cell);
          const referencedByLink = element.querySelector('.referenced-by-link') as HTMLElement
          if (referencedByLink) referencedByLink.onclick = (e) => params.referencedByOnClick(e, cell);
        })
      }

      cell.getElement().classList.add(...classNames)

      return result;
    },
    yesNoFormatter: helpers.yesNoFormatter,
    ...Mutators
  }
}
