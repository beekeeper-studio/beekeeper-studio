<template>
  <div class="grouped-table-wrapper">
    <div ref="tabulator" />
  </div>
</template>

<script>
import { Tabulator, TabulatorFull, GroupRowsModule } from 'tabulator-tables'
import pluralize from 'pluralize'
import { escapeHtml } from '@shared/lib/tabulator'

export default {

  components: {
  },
  props: ['tables', 'schemas'],
  data() {
    return {
      tabulator: null,
      loading: false,
      schemaFilter: null,
      tableFilter: null,
    }
  },
  computed: {
    tablesHaveSchemas() {
      return this.schemas.length > 1
    },
    tableColumns() {
      const rowSelection = { formatter: 'rowSelection', field: 'selectRow', titleFormatter: 'rowSelection', headerSort: false, width: 75, minWidth: 75 }
      if (this.tablesHaveSchemas) {
        return [
          rowSelection,
          { title: 'Schema', field: 'schema', editable: false, headerFilter: 'input' },
          { title: 'Table Name', field: 'name', editable: false, headerFilter: 'input' }
        ]
      }
      return [
        rowSelection,
        { title: 'Table Name', field: 'name' }
      ]
    },
    tableData() {
      return this.tables.reduce((acc, table) => {
        const { entityType, schema, name } = table

        // TODO: at some point add a list of filtered out table types (table, view, whatevs)
        if (entityType !== 'table') return acc

        acc.push(table)
        return acc
      }, [])
    }
  },
  methods: {
    selectID(schema) {
      return `select-${schema}`
    },
    selectRows(buttonAction, selectIt = true) {
      let selectedGroup
      // the groups needs to be shown because they don't exist in the DOM yet until they've at least been shown once.
      // This group search regardless helps specify which group to search instead of what it was before which was everything
      for (const group of this.tabulator.getGroups()) {
        if (group.getKey() === buttonAction) {
          selectedGroup = group
          group.show()
          break
        }
      }

      if (!selectedGroup) {
        throw new Error(`${buttonAction} group not found`)
      }

      this.$emit('select-schema', buttonAction)
      return this.tabulator[selectIt ? 'selectRow' : 'deselectRow'](selectedGroup.getRows())
    },
    rowDeselectHandler(row) {
      const { schema } = row.getData()
      if  (schema == null ){
        this.$emit('select-rows', this.tabulator.getSelectedData())
        return
      } 

      this.groupVisibility()
      this.$emit('select-rows', this.tabulator.getSelectedData())
    },
    rowSelectHandler(row) {
      const { schema } = row.getData()
      if  (schema == null ){
        this.$emit('select-rows', this.tabulator.getSelectedData())
        return
      } 

      this.groupVisibility()
      this.$emit('select-rows', this.tabulator.getSelectedData())
    },
    groupSelector(e) {
      this.selectRows(e.target.value, e.target.checked)
    },
    checkGroupCheckage(group) {
      const inputsGroupHeader = document.getElementsByName('group-header-select')
      const sansValue = escapeHtml(group.getKey())
      const rowsSelected = group.getRows().every(r => {
        const [rowSelector] = r.getElement().getElementsByTagName('input')
        return rowSelector?.checked || false
      })

      for (const groupHeader of inputsGroupHeader) {
        if (groupHeader.value === sansValue) {
          groupHeader.checked = rowsSelected
          return
        }
      }
    },
    groupVisibility() {
      for (const group of this.tabulator.getGroups()) {
        this.checkGroupCheckage(group)
      }
    },
    setSelectHeaderListener() {
      const headers = document.getElementsByName('group-header-select')
      // JIC the DOM hasn't updated yet, the elements will be there by virtue of being called when table has schemas
      if (headers.length === 0) {
        return setTimeout(this.setSelectHeaderListener, 100)
      }

      for (let i = 0; i < headers.length; i++) {
        headers[i].addEventListener('click', this.groupSelector)
      }
    },
    initializeTabulator() {
      if (this.tabulator) {
        this.tabulator.destroy()
      }
      const hasGroups = this.tablesHaveSchemas
      this.tabulator = new TabulatorFull(this.$refs.tabulator, {
        data: this.tableData,
        columns: this.tableColumns,
        layout: 'fitColumns',
        placeholder: 'Tables Loading...',
        selectable: true,
        width: '100%',
        // height: '100%',
        groupStartOpen: false,
        groupBy: hasGroups ? function (data) {
          return data.schema || ''
        } : null,
        groupHeader: hasGroups ? (value, count, data, group) => {
          // groupHeaders is called each time the headers are interacted with
          const sanValue = escapeHtml(value)
          if (hasGroups) {
            this.$nextTick(this.setSelectHeaderListener)
          }
          return `<div class="group-header"><input name="group-header-select" class="select-group" type="checkbox" value="${sanValue}" /><span>${sanValue}</span> <span style="margin-left:10px;">(${count} ${pluralize('item', count)})</span> </div>`;
        } : null,
        columnDefaults: {
          resizable: false,
          headerSort: true
        },
      })

      this.tabulator.on('rowSelected', this.rowSelectHandler)
      this.tabulator.on('rowDeselected', this.rowDeselectHandler)
      this.tabulator.on('groupVisibilityChanged', this.groupVisibility)
    }
  },
  watch: {
    tables() {
      this.initializeTabulator()
    },
    schemas() {
      this.initializeTabulator()
    }
  },
  mounted() {
    this.initializeTabulator()
  },
  unmounted() {
    if (this.tabulator) this.tabulator.destroy()
  }
}
</script>

<style lang="scss" scoped></style>
