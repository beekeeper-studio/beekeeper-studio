import { CellComponent } from 'tabulator-tables'
import { AppEvent } from '@/common/AppEvent'

export interface JsonCellDrawerPayload {
  cell: CellComponent
  columnName: string
  dataType?: string
  value: unknown
  readOnly: boolean
}

/**
 * Opens the JSON cell drawer in the secondary sidebar. Shared by the table view
 * and the query results grid.
 */
export const JsonCellDrawerMixin = {
  methods: {
    openJsonCellDrawer(
      cell: CellComponent,
      options: { dataType?: string; readOnly: boolean }
    ) {
      this.trigger(AppEvent.toggleSecondarySidebar, true)
      this.trigger(AppEvent.selectSecondarySidebarTab, 'json-cell')
      this.trigger(AppEvent.openJsonCellDrawer, {
        cell,
        columnName: cell.getField(),
        dataType: options.dataType,
        value: cell.getValue(),
        readOnly: options.readOnly,
      } as JsonCellDrawerPayload)
    },
  },
}
