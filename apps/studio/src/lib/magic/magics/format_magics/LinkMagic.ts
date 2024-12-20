import { escapeHtml } from "@shared/lib/tabulator"
import { CellComponent } from "tabulator-tables"
import { Magic } from "../../Magic"
import { MagicColumn } from "../../MagicColumn"


export const linkParams = {
  label(cell: CellComponent) {
    return escapeHtml(cell.getValue())
  },
  url(cell: CellComponent) {
    return escapeHtml(cell.getValue())
  }
}


const LinkMagic: Magic = {
  name: "LinkMagic",
  initializers: ['link', 'enlace'],
  render: function (args: string[]): MagicColumn {
    return {
      title: args[0],
      formatter: 'link',
      formatterParams: linkParams,
      cssClass: 'magic-link'
    }
  }
}

export default LinkMagic