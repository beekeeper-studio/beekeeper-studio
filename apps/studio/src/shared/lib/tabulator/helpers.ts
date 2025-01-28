import Vue from 'vue'
import { Tabulator, CellComponent, RowComponent, ColumnDefinition } from 'tabulator-tables'
import _ from 'lodash'
import rawLog from '@bksLogger'

const log = rawLog.scope('tabulator/helpers')

export function vueFormatter(component: any) {
  const ComponentClass = Vue.extend(component)
  return (cell: CellComponent, params: any, onRendered) => {

    const instance = new ComponentClass({
      propsData: { cell, params }
    })
    instance.$mount()

    onRendered(() => {
      instance.$set(instance.$data, 'rendered', true)
    })
    return instance.$el as HTMLElement
  }
}

export function vueEditor(component: any) {
  const ComponentClass = Vue.extend(component)

  return (cell:CellComponent, onRendered, success, cancel, editorParams): HTMLElement => {

    const instance = new ComponentClass({
      propsData: {cell, params: editorParams}
    })

    // this is important otherwise we bleed both event listeners
    // and memory!
    const off = () => {
      instance.$off()
      instance.$destroy()
    }

    instance.$on('value', (v: any) => {
      if (editorParams.preserveObject && _.isEqual(v, cell.getValue())) {
        success(cell.getValue()) // prevents detecting a change
      } else {
        success(v)
      }
      off()
    })

    instance.$on('cancel', () => {
      cancel()
      off()
    })

    instance.$mount()

    onRendered(() => {
      instance.$set(instance.$data, 'rendered', true)
    })



    return instance.$el as HTMLElement
  }
}

export function trashButton(handler: (e, c: CellComponent) => void): ColumnDefinition {
  return {
    field: 'trash-button',
    title: null,
    formatter: (_cell) => `<div class="dynamic-action" />`,
    width: 36,
    minWidth: 36,
    hozAlign: 'center',
    cellClick: handler,
    resizable: false,
    cssClass: "remove-btn read-only",
    editable: false
  }
}

export function moveRowHandle(): ColumnDefinition {
  return {
    title: null,
    rowHandle:true,
    formatter:"handle",
    width:30,
    frozen: true,
    minWidth:30,
    resizable: false
  }
}

export const TabulatorStateWatchers = {
  active() {
    if (!this.tabulator) return;
    if (this.active) {
      this.tabulator.restoreRedraw()
      this.$nextTick(() => {
        this.tabulator.redraw(this.forceRedraw)
        this.forceRedraw = false
      })
    } else {
      this.tabulator.blockRedraw()
    }
  },
  editedCells(newCells: CellComponent[], oldCells: CellComponent[]) {
    const removed = oldCells.filter((c) => !newCells.includes(c))
    newCells.forEach((c) => c.getElement().classList?.add('edited'))
    removed.forEach((c) => c.getElement().classList?.remove('edited'))
  },
  newRows(nuRows: RowComponent[], oldRows: RowComponent[]) {
    const removed = oldRows.filter((r) => !nuRows.includes(r))
    nuRows.forEach((r) => {
      r.getElement().classList?.add('inserted')
    })
    removed.forEach((r) => {
      r.getElement().classList?.remove('inserted')
    })
  },
  removedRows(newRemoved: RowComponent[], oldRemoved: RowComponent[]) {
    const removed = oldRemoved.filter((r) => !newRemoved.includes(r))
    newRemoved.forEach((r) => r.getElement().classList?.add('deleted'))
    removed.forEach((r) => r.getElement().classList?.remove('deleted'))
  },
  reorderedRows(newMoved: RowComponent[], oldMoved: RowComponent[]) {
    const moved = oldMoved.filter((r) => !newMoved.includes(r))
    newMoved.forEach((r) => r.getElement().classList?.add('row-moved'))
    moved.forEach((r) => r.getElement().classList?.remove('row-moved'))
  },
  tableColumns: {
    deep: true,
    handler() {
      log.debug("updating tabulator with columns", this.tableColumns)
      if (!this.tabulator) return
      const t: Tabulator = this.tabulator
      t.setColumns(this.tableColumns)
      t.redraw()
    }
  },
  tableData: {
    deep: true,
    handler(nu, old) {
      if (!this.tabulator) return
      const different = _.xorWith(nu, old, _.isEqual)
      // deep equality sometimes makes this fire when data hasn't really changed...
      if (!different?.length) return
      log.debug("replacing data in tabulator", old, nu)
      this.tabulator.replaceData(nu)
      this.newRows = []
      this.removedRows = []
      if (!_.isUndefined(this.editedCells)) this.editedCells = []
    }
  },
  table: {
    deep: true,
    handler() {
      log.debug("table changed - initializing Tabulator")
      this.initializeTabulator()
    }
  }
}
