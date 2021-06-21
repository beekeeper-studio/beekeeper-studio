import Tabulator from 'tabulator-tables';

interface Options {
  allowEmpty: boolean
}

export default function CheckboxFormatter(cell: Tabulator.CellComponent, options: Options, ...args) {
  const checked = cell.getValue() === true ? 'checked' : ''
  console.log(cell.getValue())
  return `<div class="tabulator-checkbox"><input type="checkbox" ${checked}/></div>`
}