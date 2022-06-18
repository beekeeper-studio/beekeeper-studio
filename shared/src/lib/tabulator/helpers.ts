import Vue from 'vue'
import { Tabulator } from 'tabulator-tables'
import _ from 'lodash'
import rawLog from 'electron-log'

const log = rawLog.scope('tabulator/helpers')

type CellComponent = Tabulator.CellComponent
type RowComponent = Tabulator.RowComponent
type ColumnDefinition = Tabulator.ColumnDefinition

export function vueFormatter(component: any) {
  const ComponentClass = Vue.extend(component)
  return (cell: Tabulator.CellComponent, params: any, onRendered) => {

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

  return (cell:Tabulator.CellComponent, onRendered, success, cancel, editorParams): HTMLElement => {

    const instance = new ComponentClass({
      propsData: {cell, params: editorParams}
    })

    // this is important otherwise we bleed both event listeners
    // and memory!
    const off = () => {
      instance.$off()
      instance.$destroy()
    }

    instance.$on('value', (v) => {
      success(v)
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

export function trashButton(handler: (e, c: Tabulator.CellComponent) => void): ColumnDefinition {
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
  tableColumns: {
    deep: true,
    handler() {
      log.debug("updating tabulator with columns")
      if (!this.tabulator) return
      const t: Tabulator = this.tabulator
      t.setColumns(this.tableColumns)
    }
  },
  tableData: {
    deep: true,
      handler(nu, old) {
      if (!this.tabulator) return
      const different = _.xorWith(nu, old, _.isEqual)
      // deep equality sometimes makes this fire when data hasn't really changed...
      if (!different?.length) return
      log.debug("replacing data in tabulator")
      this.tabulator.replaceData(this.tableData)
      this.newRows = []
      this.removedRows = []
      if (!_.isUndefined(this.editedCells)) this.editedCells = []
    }
  },
  table: {
    deep: true,
    handler() {
      this.initializeTabulator()
    }
  }
}
