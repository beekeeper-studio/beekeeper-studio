<template>
  <div class="table-wrapper">
    <div ref="tabulator"></div>
  </div>
</template>
<style lang="scss" scoped>
  .table-wrapper {
    background-color: pink;
  }
</style>

<script lang="ts">
import Vue from 'vue'
import Tabulator from 'tabulator-tables'
import { getDialectData } from '../lib/dialects'
import tab from '../lib/tabulator'

export default Vue.extend({
  props: ['initialSchema', 'initialName', 'dialect'],
  data() {
    return {
      name: "untitled_table",
      schema: [],
      tabulator: null,
    }
  },

  computed: {
    autoCompleteOptions() {
      return {
        freetext: true,
        allowEmpty: false,
        values: getDialectData(this.dialect).columnTypes.map((d) => d.pretty),
        defaultValue: 'varchar(255)',
        showListOnEmpty: true
      }
    },
    tableData() {
      return this.schema
    },
    tableColumns() {
      return [
        {title: 'Position', field: 'ordinalPosition', headerTooltip: 'The ordinal position of the columns'},
        {title: 'Name', field: 'columnName', editor: null && 'input', cellEdited: this.cellEdited, headerFilter: true},
        {title: 'Type', field: 'dataType', editor: null && 'autocomplete', editorParams: this.autocompleteOptions, cellEdited: this.cellEdited}, 
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
    }
  },
  methods: {
    cellEdited(c) {
      console.log('--> Cell edited!', c)
    },
    cellFormatter: tab.cellFormatter,
    yesNoFormatter: tab.yesNoFormatter
  },

  mounted() {
    if (this.initialSchema){
      this.schema = [...this.initialSchema]
    }
    if (this.initialName) this.name = this.initialName

    this.tabulator = new Tabulator(this.$refs.tabulator, {
      data: this.tableData,
      reactiveData: true,
      columns: this.tableColumns
    })
  }
})
</script>