import { FieldDescriptor } from "../db/client";
import globals from '../../common/globals'

interface ColumnDef {
  id: string
}

interface SlimTableKey {
  toTable: string
}

export function fkColumn(column: ColumnDef, keyData: SlimTableKey, onClick: any): any {
  const icon = () => "<i class='material-icons fk-link'>launch</i>"
  const tooltip = () => {
    return `View record in ${keyData.toTable}`
  }
  return {
    headerSort: false,
    download: false,
    width: globals.fkColumnWidth,
    resizable: false,
    field: column.id + '-link',
    title: "",
    cssClass: "foreign-key-button",
    cellClick: onClick,
    formatter: icon,
    tooltip
  }
}