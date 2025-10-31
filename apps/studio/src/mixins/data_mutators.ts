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
    // Shared JSON highlighting helper; returns highlighted HTML or null if not JSON
    maybeHighlightJson(raw: string, opts: { forCell?: boolean, forTooltip?: boolean } = {}) {
      if (!_.isString(raw)) return null
      const trimmed = raw.trim()
      if (!((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']')))) return null
      try {
        const parsed = JSON.parse(raw)
        const pretty = JSON.stringify(parsed, null, 2)
        if (opts.forTooltip) {
          const maxLen = 8000
          const display = pretty.length > maxLen ? pretty.slice(0, maxLen) + '\n… (truncated)' : pretty
          return `<pre class=\"json-tooltip json-type\">${buildJsonHtml(display)}</pre>`
        }
        if (opts.forCell) {
          const singleLine = pretty.replace(/\n\s*/g, ' ') // flatten for cell
          return `<pre class=\"json-cell\">${buildJsonHtml(singleLine)}</pre>`
        }
        return `<pre class=\"json-cell\">${buildJsonHtml(pretty)}</pre>`
      } catch (e) {
        return null
      }
    },
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
  // formatterParams can be heterogeneous; avoid over-constrained type assertion
  const params = cell.getColumn().getDefinition().formatterParams || {}
      let cellValue = cell.getValue()

      if (cellValue instanceof Uint8Array) {
  const binaryEncoding = (params as any).binaryEncoding || 'hex'
        cellValue = `${_.truncate(this.niceString(cellValue, false, binaryEncoding), { length: 15 })} (as ${binaryEncoding} string)`
      } else if (
  !(params as any)?.fk &&
  !(params as any)?.isPK &&
        _.isInteger(Number(cellValue))
      ) {
        try {
          cellValue += ` (${new Date(Number(cellValue)).toISOString()} in unixtime)`
        } catch (e) {
          console.error(`${cellValue} cannot be converted to a date`)
        }
      }
      
      const nullValue = emptyResult(cellValue)
      if (nullValue) return nullValue

      // If value is valid JSON, pretty-print (plain text) for readability
      if (_.isString(cellValue)) {
        const trimmed = cellValue.trim()
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
          try {
            const parsed = JSON.parse(cellValue)
            const pretty = JSON.stringify(parsed, null, 2)
            const maxLen = 5000
            const display = pretty.length > maxLen ? pretty.slice(0, maxLen) + '\n… (truncated)' : pretty
            return display // plain text (Tabulator will escape and show as default tooltip)
          } catch (e) { /* ignore if not valid JSON */ }
        }
      }
      return escapeHtml(this.niceString(cellValue, true))
    },
    cellFormatter(
      cell: CellComponent,
      params: { fk?: any[], isPK?: boolean, fkOnClick?: (e: MouseEvent, cell: CellComponent) => void, binaryEncoding?: string } = {},
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

      let result: string
      if (_.isString(cellValue)) {
        const highlighted = this.maybeHighlightJson(cellValue, { forCell: true })
        if (highlighted) {
          result = highlighted
          classNames.push('json-type')
        } else {
          result = `<pre>${escapeHtml(cellValue)}</pre>`
        }
      } else {
        result = `<pre>${escapeHtml(cellValue)}</pre>`
      }
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

/*
 * NOTE: JSON syntax highlighting implemented in cellFormatter is a lightweight regex-based
 * tokenizer intended for short/medium JSON payloads. For very large JSON (multi-kilobyte) the
 * formatting is truncated inside tooltips for performance. If future requirements include
 * extremely large JSON values with full fidelity consider swapping to a streaming tokenizer.
 */
// Helper: shared JSON highlighting (returns null if not JSON)
export function buildJsonHtml(jsonText: string) {
  const escaped = escapeHtml(jsonText)
  return escaped
    .replace(/(&quot;)([^&]*?)(&quot;)(:\s)/g, (_m, _q1, key, _q3, colon) => `<span class=\"json-key\">&quot;${key}&quot;</span>${colon}`)
    .replace(/(&quot;)([^&]*?)(&quot;)/g, (_m, _q1, str, _q3) => `<span class=\"json-string\">&quot;${str}&quot;</span>`)
    .replace(/\b(-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)\b/g, '<span class=\"json-number\">$1</span>')
    .replace(/\b(true|false)\b/g, '<span class=\"json-boolean\">$1</span>')
    .replace(/\bnull\b/g, '<span class=\"json-null\">null</span>')
}

