<template>
  <section class="import-section-wrapper schema-builder">
    <div class="card-flat padding form-group">
      <label class="checkbox-group">
        <input
          type="checkbox"
          class="form-control"
          v-model="truncateTable"
        >
        Truncate the table before importing new data
      </label>
      <label class="checkbox-group">
        <input
          type="checkbox"
          class="form-control"
          v-model="runAsUpsert"
        >
        Import data as an Upsert (Be sure to map a primary key field!)
      </label>
    </div>
    <div
      class="mapper-wrapper"
      ref="tabulator"
    />
  </section>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import { Tabulator, TabulatorFull } from 'tabulator-tables'
import Mutators, { emptyResult, buildNullValue } from '../../mixins/data_mutators'
import { trashButton, vueEditor, vueFormatter } from '@shared/lib/tabulator/helpers'
import CheckboxFormatterVue from '@shared/components/tabulator/CheckboxFormatter.vue'
import CheckboxEditorVue from '@shared/components/tabulator/CheckboxEditor.vue'
import { escapeHtml } from '@shared/lib/tabulator'
import { getDialectData } from '@shared/lib/dialects'
export default {
  components: {

  },
  props: {
    stepperProps: {
      type: Object,
      required: true,
      default: () => ({
        schema: null,
        table: null,
        tabId: null
      })
    },
  },
  mixins: [Mutators],
  data() {
    return {
      importerId: null,
      table: null,
      tabulator: null,
      tableColumnNames: {},
      previewData: null,
      nonNullableColumns: [],
      ignoreText: 'IGNORE',
      truncateTable: false,
      runAsUpsert: false,
      createTable: true,
      importOptions: null
    }
  },
  computed: {
    ...mapGetters(['dialect', 'dialectData']),
    ...mapGetters(['schemaTables']),
    ...mapGetters('imports', {'getImportOptions': 'getImportOptions'}),
    ...mapState('imports', {'tablesToImport': 'tablesToImport'}),
    columnTypes() {
      return this.dialectData.columnTypes.map((c) => c.pretty)
    },
    disabledFeatures() {
      return this.dialectData.disabledFeatures
    },
    importDataTypes() {
      return this.dialectData.importDataType
    },
    createTableColumns () {
      const selectOptions = {
        values: {[this.ignoreText]: this.ignoreText, ...this.columnTypes}
      }

      return [
        {
          title: 'Map to File Column',
          field: 'fileColumn',
          editable: false,
          formatter: this.fileColumnFormatter,
          cssClass: 'import-file-column'
        },
        {
          title: 'New Table Column',
          field: 'tableColumn',
          editable: true,
          formatter: this.fileColumnFormatter,
          cssClass: 'import-file-column'
        },
        {
          title: 'Type',
          field: 'columnType',
          editable: true,
          editor: 'list',
          editorParams: selectOptions,
          cssClass: 'import-table-column',
        },
        (this.disabledFeatures?.nullable ? null : {
          title: 'Nullable',
          field: 'nullable',
          headerTooltip: "Allow this column to contain a null value",
          editor: vueEditor(CheckboxEditorVue),
          formatter: vueFormatter(CheckboxFormatterVue),
          formatterParams: {
            editable: true
          },
          cellEdited: this.cellEdited,
          editable: true,
          width: 70,
          cssClass: 'import-table-column',
        }),
        (this.disabledFeatures?.primary ? null : {
          title: 'Primary',
          field: 'primary',
          tooltip: false,
          editable: false,
          formatter: vueFormatter(CheckboxFormatterVue),
          formatterParams: {
            editable: false
          },
          width: 70,
          cssClass: 'read-only never-editable',
        }),
        {
          field: 'trash-button',
          title: null,
          formatter: (_cell) => `<div class="dynamic-action" title="Remove mapping" />`,
          width: 36,
          minWidth: 36,
          hozAlign: 'center',
          cellClick: (e, cell) => {
            cell.getRow().update({'tableColumn': this.ignoreText})
          },
          resizable: false,
          cssClass: "remove-btn read-only",
          editable: false
        }
      ]
    },
    importColumns () {
      const selectOptions = {
        values: {[this.ignoreText]: this.ignoreText, ...this.tableColumnNames}
      }

      return [
        {
          title: 'File Column',
          field: 'fileColumn',
          formatter: this.fileColumnFormatter,
          cssClass: 'import-file-column'
        },
        {
          title: 'Table Column',
          field: 'tableColumn',
          editable: true,
          editor: 'list',
          editorParams: selectOptions,
          formatter: this.importFormatter,
          cssClass: 'import-table-column',
        },
        {
          field: 'trash-button',
          title: null,
          formatter: (_cell) => `<div class="dynamic-action" title="Remove mapping" />`,
          width: 36,
          minWidth: 36,
          hozAlign: 'center',
          cellClick: (e, cell) => {
            cell.getRow().update({'tableColumn': this.ignoreText})
          },
          resizable: false,
          cssClass: "remove-btn read-only",
          editable: false
        }
      ]
    },
  },
  methods: {
    getTable(tableData) {
      console.log(tableData)
      if (!tableData) return null

      const { schema, name: tableName } = tableData
      let foundSchema = ''
      if (this.schemaTables.length > 1) {
        foundSchema = this.schemaTables.find(s => s.schema === schema)
      } else {
        foundSchema = this.schemaTables[0]
      }
      return foundSchema.tables.find(t => t.name === tableName)
    },
    fileColumnFormatter(cell) {
      const cellValue = cell.getValue()
      return `<span class="expand">${escapeHtml(cellValue)}</span><i class="material-icons">right_arrow</i>`
    },
    importFormatter(cell) {
      const cellValue = cell.getValue()
      if (cellValue == this.ignoreText) return buildNullValue(this.ignoreText)
      const column = this.findByColumnName(cellValue)
      const attributesToShow = this.getColumnAttributes(column).join(" ")
      const attributesSpan = `<span class='attributes'>${escapeHtml(attributesToShow)}</span>`
      return `${cellValue} ${attributesSpan}`
    },
    importKey() {
      return `new-import-${this.stepperProps.tabId}`
    },
    betterColumnName(cName) {
      return cName.replace(/\s+/g, '_').toLowerCase()
    },
    getColumnType(dataTypes) {
      const dt = new Set(dataTypes)
      dt.delete('null')

      if (dt.size > 1) {
        return this.importDataTypes.defaultType
      }

      return this.importDataTypes[dt.values().next().value]
    },
    async tableData(importedColumns) {
      const { meta } = await this.$util.send('import/getFileAttributes', { id: this.importerId })
      const importOptions = await this.getImportOptions(this.importKey())
      const tableColumns = new Map()

      importedColumns.forEach(ic => {
        const strippedField = ic.toLowerCase().replace(/[^0-9a-z]/gi, '')
        tableColumns.set(strippedField, ic)
      })

      return meta.fields.map(f => {
        const strippedField = f.toLowerCase().replace(/[^0-9a-z]/gi, '')
        const dataMap = importOptions?.importMap?.find(t => t.fileColumn === f)
        let tableColumn = dataMap?.tableColumn ?? this.ignoreText

        if (tableColumn === this.ignoreText && tableColumns.has(strippedField)) {
          tableColumn = tableColumns.get(strippedField)
        }

        return {
          fileColumn: f,
          tableColumn
        }
      })
    },
    async createTableData(importedColumns) {
      const response = await this.$util.send('import/generateColumnTypesFromFile', { id: this.importerId })
      console.log(response)

      return response.map(resp => (
        {
          fileColumn: resp.columnName,
          tableColumn: this.betterColumnName(resp.columnName),
          columnType: this.getColumnType(resp.dataTypes),
          nullable: resp.dataTypes.has('null'),
          primary: resp.primary
        }
      ))
    },
    findByColumnName (tableColumn) {
      return tableColumn ? this.table.columns.find(({columnName}) => columnName === tableColumn) : null
    },
    getColumnAttributes (column) {
      if (!column) return []
      return [
        column.dataType,
        column.nullable ? null : 'NOT NULL',
        column.default ? `(has default)` : null,
      ].filter(c => !!c)
    },
    async initTabulator() {
      console.log('init tabulator', this.createTable)
      if (this.createTable) {
        this.tabulator = new TabulatorFull(this.$refs.tabulator, {
          data: await this.createTableData(),
          columns: this.createTableColumns,
          layout: 'fitColumns',
          placeholder: 'No Data',
          columnDefaults: {
            resizable: false,
            headerSort: false,
            editable: false
          },
          height: 'auto'
        })
        return
      }

      const importedColumns = this.table.columns.map(t => t.columnName)
      this.tabulator = new TabulatorFull(this.$refs.tabulator, {
        data: await this.tableData(importedColumns),
        columns: this.importColumns,
        layout: 'fitColumns',
        placeholder: 'No Data',
        columnDefaults: {
          resizable: false,
          headerSort: false,
          editable: false
        },
        height: 'auto'
      })
    },
    async onFocus () {
      const importOptions = await this.tablesToImport.get(this.importKey())
      if (importOptions.importMap && this.importerId && this.tabulator) {
        this.tabulator.redraw()
      } else {
        this.initialize()
      }
    },
    canContinue() {
      if (this.tabulator === null) return false
      const nonNullableColumns = new Set(this.nonNullableColumns)
      const tableData = this.tabulator.getData()
        .filter(t => t.tableColumn.toLowerCase().trim() !== this.ignoreText.toLowerCase() && t.tableColumn !== '')
        .map(t => t.tableColumn)
      const tableDataSet = new Set(tableData)

      this.tabulator.getData().forEach(data => {
        if (data.tableColumn.toLowerCase().trim() === this.ignoreText.toLowerCase()) {
          return
        }
        nonNullableColumns.delete(data.tableColumn)
      })

      if (nonNullableColumns.size > 0) {
        this.$noty.error(`The following table columns are 'NOT NULL' columns without a default, so they must be included in your mapping: ${Array.from(nonNullableColumns).join(', ')}`)
        return false
      }

      if (tableData.length !== tableDataSet.size) {
        const duplicates = tableData.filter(t => {
          if (tableDataSet.has(t)) {
            tableDataSet.delete(t)
          } else {
            return t
          }
        })

        this.$noty.error(`The following table columns can only be mapped to one header: ${duplicates.join(', ')}`)
        return false
      }

      return true
    },
    async onNext() {
      const importOptions =  await this.tablesToImport.get(this.importKey())
      importOptions.importMap = await this.$util.send('import/mapper', { id: this.importerId, dataToMap: this.tabulator.getData() })
      importOptions.truncateTable = this.truncateTable
      importOptions.runAsUpsert = this.runAsUpsert

      const importData = {
        table: this.importKey(),
        importProcessId: this.importerId,
        importOptions
      }
      this.$store.commit('imports/upsertImport', importData)
    },
    async initialize () {
      console.log('I am here')
      const importOptions = await this.tablesToImport.get(this.importKey())
      this.table = this.getTable(importOptions.table)

      if (this.table) {
        await this.$store.dispatch('updateTableColumns', this.table)
        this.table = this.getTable(importOptions.table)
        const { tableColumnNames, nonNullableColumns } = this.table.columns.reduce((acc, column) => {
          const columnText = [column.columnName, ...this.getColumnAttributes(column)]
  
          acc.tableColumnNames[column.columnName] = `${columnText.join(' ')}`
  
          if (!column.nullable && !column.hasDefault) {
            acc.nonNullableColumns.push(column.columnName)
          }
  
          return acc
        }, { tableColumnNames: {}, nonNullableColumns: []})
        this.tableColumnNames = tableColumnNames
        this.nonNullableColumns = nonNullableColumns
        this.createTable = false
      }

      if (!importOptions.importProcessId) {
        this.importerId = await this.$util.send('import/init', { options: importOptions })
      } else {
        this.importerId = importOptions.importProcessId
      }

      console.log('this.table', this.table)

      this.initTabulator()
    },
  },
  mounted () {
    this.initialize()
  },
  unmounted() {
    if (this.tabulator) this.tabulator.destroy()
  }
}
</script>

<style lang="scss" scoped>
  .mapper-wrapper {
    margin-top: 2rem;
  }
  .checkbox-group:last-of-type {
    padding-top: 1rem;
  }
</style>
