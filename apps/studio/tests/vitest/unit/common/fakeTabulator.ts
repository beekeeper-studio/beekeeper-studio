// A tabulator stand-in for specs of the grid selection helpers and menu params

type Row = Record<string, unknown>

export function column(field: string, title = field, visible = true) {
  return {
    getField: () => field,
    getDefinition: () => ({ title }),
    isVisible: () => visible,
  }
}

export function row(data: Row, position: number) {
  return { getData: () => data, getPosition: () => position }
}

const columns = [
  column('--row-header--bks', ''),
  column('c0', 'id'),
  column('c1', 'city'),
  column('c2', 'hidden', false),
]
const data: Row[] = [
  { c0: 1, c1: 'Seattle', c2: 'x' },
  { c0: BigInt(2), c1: 'Brooklyn', c2: 'y' },
]

/**
 * A tabulator stand-in. `selection` is [first row, last row, column fields].
 * `selecting` is the range module's mode: "row" or "column" after a header click.
 */
export function fakeTabulator(selection?: [number, number, string[]], selecting = 'cell') {
  const rows = data.map((d, i) => row(d, i + 1))
  const ranges = selection
    ? [{
        getRows: () => rows.slice(selection[0], selection[1] + 1),
        getColumns: () => columns.filter((c) => selection[2].includes(c.getField())),
      }]
    : []
  return {
    getColumns: () => columns,
    getRows: () => rows,
    getRanges: () => ranges,
    modules: { selectRange: { selecting } },
  } as any
}
