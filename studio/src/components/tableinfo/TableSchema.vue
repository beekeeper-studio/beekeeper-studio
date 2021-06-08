<template>
  <div class="table-info-table table-schema">
    <div class="table-subheader">
      <div class="table-title">
        <h2>Columns</h2>
      </div>
      <div class="table-actions">
        <!-- <a class="btn btn-flat btn-icon btn-small"><i class="material-icons">add</i> Column</a> -->
      </div>
    </div>
    <div class="card-flat">
      <div ref="tableSchema"></div>
    </div>
  </div>
</template>
<script>
import Tabulator from 'tabulator-tables'
import DataMutators from '../../mixins/data_mutators'
import _ from 'lodash'
import Vue from 'vue'
import globals from '../../common/globals'
export default {
  mixins: [DataMutators],
  props: ["table", "connection", "tabID", "active", "primaryKeys", 'columnTypes'],
  data() {
    return {
      tabulator: null,
      actualTableHeight: "100%",
      forceRedraw: false,
      stagedChanges: [],
    }
  },
  watch: {
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
    tableData() {
      if (!this.tabulator) return
      this.tabulator.replaceData(this.tableData)
    }
  },
  computed: {
    tableColumns() {
      const autocompleteOptions = {
        freetext: true,
        allowEmpty: false,
        values: this.columnTypes,
        defaultValue: 'varchar(255)',
        showListOnEmpty: true
      }
      return [
        {title: 'Position', field: 'ordinalPosition', headerTooltip: 'The ordinal position of the columns'},
        {title: 'Name', field: 'columnName', editor: null && 'input', cellEdited: this.cellEdited, headerFilter: true},
        {title: 'Type', field: 'dataType', editor: null && 'autocomplete', editorParams: autocompleteOptions, cellEdited: this.cellEdited}, 
        {
          title: 'Nullable',
          field: 'nullable',
          headerTooltip: "Allow this column to contain a null value",
          editor: null && 'select',
          editorParams: {
            values: [
              {label: "YES", value: true},
              {label: "NO", value: false}
            ]
          },
          formatter: this.yesNoFormatter,
          cellEdited: this.cellEdited
        },
        {
          title: 'Default Value',
          field: 'defaultValue',
          editor: null && 'input',
          headerTooltip: "If you don't set a value for this field, this is the default value",
          cellEdited: this.cellEdited,
          formatter: this.cellFormatter
        },
        {title: 'Primary', field: 'primary', formatter: 'tickCross', formatterParams: { allowEmpty: true}},
      ]
    },
    tableData() {
      const keys = _.keyBy(this.primaryKeys, 'columnName')
      return this.table.columns.map((c) => {
        const key = keys[c.columnName]
        return { 
          primary: !!key || null,
          ...c
        }
      })
    },
  },
  methods: {
    cellEdited(cell, ...props) {
      const columnName = cell.getRow().getCells().find((c) => c.getField())
      const change = {
        columnName,
        aspect: cell.getField(),
        newValue: cell.getValue(),
        cell: cell
      }
      this.stagedChanges.push(change)
      cell.getElement().classList.add('edited')
    }
  },
  mounted() {
    // const columnWidth = this.table.columns.length > 20 ? 125 : undefined
    if (!this.active) this.forceRedraw = true
    this.tabulator = new Tabulator(this.$refs.tableSchema, {
      columns: this.tableColumns,
      layout: 'fitDataFill',
      tooltips: true,
      data: this.tableData,
      columnMaxInitialWidth: globals.maxColumnWidthTableInfo,
      placeholder: "No Columns"
    })
  }
}
</script>